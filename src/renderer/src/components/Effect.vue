<template>
  <canvas ref="canvas"></canvas>
</template>

<script>
export default {
  name: "Firework",
  data() {
    return {
      canvas: null,
      ctx: null,
      w: 0,
      h: 0,
      particles: [],
      probability: 0.04,
      xPoint: 0,
      yPoint: 0,
      animationFrame: null,
    };
  },
  mounted() {
    this.initCanvas();
    window.addEventListener("resize", this.resizeCanvas);
    this.updateWorld();
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.resizeCanvas);
    cancelAnimationFrame(this.animationFrame);
  },
  methods: {
    initCanvas() {
      this.canvas = this.$refs.canvas;
      this.ctx = this.canvas.getContext("2d");
      this.resizeCanvas();
    },
    resizeCanvas() {
      if (this.canvas) {
        this.w = this.canvas.width = window.innerWidth;
        this.h = this.canvas.height = window.innerHeight;
      }
    },
    updateWorld() {
      this.update();
      this.paint();
      this.animationFrame = requestAnimationFrame(this.updateWorld);
    },
    update() {
      if (this.particles.length < 1000 && Math.random() < this.probability) {
        this.createFirework();
      }
      const alive = [];
      for (const particle of this.particles) {
        if (particle.move()) {
          alive.push(particle);
        }
      }
      this.particles = alive;
    },
    paint() {
      this.ctx.clearRect(0, 0, this.w, this.h);
      this.ctx.globalCompositeOperation = "lighter";
      for (const particle of this.particles) {
        particle.draw(this.ctx);
      }
    },
    createFirework() {
      this.xPoint = Math.random() * (this.w - 200) + 100;
      this.yPoint = Math.random() * (this.h - 200) + 100;
      const nFire = Math.random() * 100 + 150;
      const c = `rgb(${~~(Math.random() * 200 + 55)},${~~(
        Math.random() * 200 +
        55
      )},${~~(Math.random() * 200 + 55)})`;

      for (let i = 0; i < nFire; i++) {
        const particle = new Particle(this.xPoint, this.yPoint);
        particle.color = c;
        const vy = Math.sqrt(25 - particle.vx * particle.vx);
        if (Math.abs(particle.vy) > vy) {
          particle.vy = particle.vy > 0 ? vy : -vy;
        }
        this.particles.push(particle);
      }
    },
  },
};

class Particle {
  constructor(xPoint, yPoint) {
    this.w = this.h = Math.random() * 6 + 2;
    this.x = xPoint - this.w / 2;
    this.y = yPoint - this.h / 2;
    this.vx = (Math.random() - 0.5) * 10;
    this.vy = (Math.random() - 0.5) * 10;
    this.alpha = Math.random() * 0.5 + 0.5;
    this.gravity = 0.05;
    this.color = null;
  }

  move() {
    this.x += this.vx;
    this.vy += this.gravity;
    this.y += this.vy;
    this.alpha -= 0.01;
    if (
      this.x <= -this.w ||
      this.x >= window.innerWidth ||
      this.y >= window.innerHeight ||
      this.alpha <= 0
    ) {
      return false;
    }
    return true;
  }

  draw(c) {
    c.save();
    c.beginPath();
    c.translate(this.x + this.w / 2, this.y + this.h / 2);
    c.arc(0, 0, this.w, 0, Math.PI * 2);
    c.fillStyle = this.color;
    c.globalAlpha = this.alpha;
    c.closePath();
    c.fill();
    c.restore();
  }
}
</script>

<style scoped>
canvas {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 2000;
}
</style>
