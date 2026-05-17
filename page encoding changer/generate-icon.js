const fs = require("fs");
const { createCanvas } = require("canvas");

const canvas = createCanvas(128, 128);
const ctx = canvas.getContext("2d");

const gradient = ctx.createLinearGradient(0, 0, 128, 128);
gradient.addColorStop(0, "#4a90d9");
gradient.addColorStop(1, "#357abd");

ctx.fillStyle = gradient;
ctx.beginPath();
ctx.roundRect(0, 0, 128, 128, 20);
ctx.fill();

ctx.fillStyle = "white";
ctx.font = "bold 48px Arial";
ctx.textAlign = "center";
ctx.fillText("Aa", 64, 52);

ctx.font = "24px monospace";
ctx.globalAlpha = 0.9;
ctx.fillText("文", 64, 85);

ctx.fillStyle = "white";
ctx.globalAlpha = 0.5;
ctx.beginPath();
ctx.roundRect(24, 95, 80, 8, 4);
ctx.fill();

const buffer = canvas.toBuffer("image/png");
fs.writeFileSync("icon.png", buffer);

console.log("Icon created successfully!");
