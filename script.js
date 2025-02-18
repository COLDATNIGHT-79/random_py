// Alias some Matter modules
const Engine = Matter.Engine,
      Render = Matter.Render,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Body = Matter.Body,
      Mouse = Matter.Mouse,
      MouseConstraint = Matter.MouseConstraint,
      Composite = Matter.Composite,
      Events = Matter.Events;

// Create the engine and set gravity
const engine = Engine.create();
engine.world.gravity.y = 1;

// Get our canvas element and create a renderer
const canvas = document.getElementById("matter-canvas");
const render = Render.create({
  canvas: canvas,
  engine: engine,
  options: {
    width: window.innerWidth,
    height: window.innerHeight - 80,
    wireframes: false,
    background: '#f0f0f0'
  }
});

// Adjust the canvas on window resize
window.addEventListener('resize', () => {
  render.options.width = window.innerWidth;
  render.options.height = window.innerHeight - 80;
  Render.setPixelRatio(render, window.devicePixelRatio);
});

// Create boundaries so objects stay on screen
const boundaries = [
  // Ground
  Bodies.rectangle(window.innerWidth/2, window.innerHeight - 40, window.innerWidth, 60, { isStatic: true }),
  // Left wall
  Bodies.rectangle(-30, (window.innerHeight - 80)/2, 60, window.innerHeight, { isStatic: true }),
  // Right wall
  Bodies.rectangle(window.innerWidth+30, (window.innerHeight - 80)/2, 60, window.innerHeight, { isStatic: true })
];
World.add(engine.world, boundaries);

// Keep track of message IDs that have already been added
const addedMessages = new Set();

// Function to create a physics block for a message
function createMessageBlock(message, id) {
  const text = message;
  // Compute width based roughly on text length (with a max width)
  let width = Math.min(300, 20 + text.length * 8);
  let height = 50;

  // Random starting x position (and starting at the top)
  const x = Math.random() * (window.innerWidth - width) + width/2;
  const y = 0;

  // Pick a random color from the color wheel
  const hue = Math.floor(Math.random() * 360);
  const color = `hsl(${hue}, 70%, 50%)`;

  // Create a Matter.js body; we set `visible: false` so we can custom-draw it.
  const body = Bodies.rectangle(x, y, width, height, {
    restitution: 0.8,
    friction: 0.5,
    render: {
      fillStyle: color,
      strokeStyle: '#000',
      lineWidth: 1,
      visible: false
    }
  });

  // Save custom properties to be used during custom rendering
  body.custom = {
    text: text,
    color: color,
    width: width,
    height: height
  };

  World.add(engine.world, body);
  if (id) addedMessages.add(id);
}

// Custom drawing: After Matter.js renders, we draw our rounded rectangle and text
Events.on(render, 'afterRender', function() {
  const context = render.context;
  const bodies = Composite.allBodies(engine.world);
  bodies.forEach(body => {
    if (body.custom) {
      const pos = body.position;
      const angle = body.angle;
      const width = body.custom.width;
      const height = body.custom.height;
      const text = body.custom.text;
      const color = body.custom.color;
      
      context.save();
      context.translate(pos.x, pos.y);
      context.rotate(angle);
      
      // Draw a rounded rectangle
      const radius = 10;
      context.beginPath();
      roundRect(context, -width/2, -height/2, width, height, radius);
      context.fillStyle = color;
      context.fill();
      context.lineWidth = 1;
      context.strokeStyle = '#000';
      context.stroke();
      
      // Draw the message text
      context.fillStyle = '#fff';
      context.font = "16px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, 0, 0);
      
      context.restore();
    }
  });
});

// Helper to draw a rounded rectangle on a canvas
function roundRect(ctx, x, y, width, height, radius) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Enable mouse interaction (click and drag objects)
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: {
    stiffness: 0.2,
    render: { visible: false }
  }
});
World.add(engine.world, mouseConstraint);

// Run the engine and renderer
Engine.run(engine);
Render.run(render);

// --- Submit new message ---
document.getElementById("submitButton").addEventListener("click", () => {
  const input = document.getElementById("messageInput");
  const message = input.value.trim();
  if (message === "") return;
  
  // POST the message to our Python API
  fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: message })
  })
    .then(response => response.json())
    .then(data => {
      // Create the new message block
      createMessageBlock(data.message, data._id);
      input.value = "";
    })
    .catch(err => console.error("Error posting message:", err));
});

// --- Poll for new messages every 5 seconds ---
function fetchMessages() {
  fetch("/api/messages")
    .then(response => response.json())
    .then(data => {
      data.forEach(item => {
        if (!addedMessages.has(item._id)) {
          createMessageBlock(item.message, item._id);
        }
      });
    })
    .catch(err => console.error("Error fetching messages:", err));
}
fetchMessages();
setInterval(fetchMessages, 5000);
