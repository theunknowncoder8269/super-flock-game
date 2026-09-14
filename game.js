window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const charSelect = document.getElementById('char-select');
  const btnThunder = document.getElementById('btn-thunderwings');
  const btnSolar = document.getElementById('btn-solarflair');

  let heroColor = '#0088ff';
  let gameRunning = false;
  let gameState = 'RUNNING'; // 'RUNNING', 'BOSS_BATTLE', 'VICTORY'

  // Game Stats
  let score = 0;
  let health = 3.0;
  let isShielded = false;    
  let isSunBarrier = false;  
  let sunBarrierHits = 0;    
  let flashTimer = 0;        
  let speedBoostTimer = 0; 
  let frameCount = 0;

  // Player Object
  const player = {
    x: 100,
    y: 180,
    startX: 100,
    width: 30,
    height: 20,
    baseSpeed: 5,
    power: 'thunder',
    isFlapping: false,
    flapTimer: 0,
    isDashing: false,
    dashTimer: 0,
    trail: []
  };

  // Goose King Boss Object
  const boss = {
    x: 850,
    y: 120,
    width: 110,
    height: 110,
    health: 60,
    maxHealth: 60,
    attackTimer: 0,
    laserActive: false,
    laserY: 0,
    isStunned: false
  };

  // Environment & Entities
  let buildings = [
    { x: 0, width: 90, height: 180, color: '#16213e' },
    { x: 110, width: 70, height: 240, color: '#0f3460' },
    { x: 200, width: 100, height: 150, color: '#16213e' },
    { x: 320, width: 80, height: 210, color: '#0f3460' },
    { x: 420, width: 110, height: 170, color: '#16213e' },
    { x: 550, width: 75, height: 260, color: '#0f3460' },
    { x: 650, width: 95, height: 190, color: '#16213e' },
    { x: 760, width: 80, height: 220, color: '#0f3460' }
  ];

  let obstacles = [];
  let items = [];
  let pellets = [];
  let solarPulses = [];
  let windWaves = [];
  let bossProjectiles = [];

  const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

  // Key Event Listeners
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp') keys.ArrowUp = true;
    if (e.code === 'ArrowDown') keys.ArrowDown = true;
    if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight') keys.ArrowRight = true;

    // Check for Dual Power (Left + Right together)
    if (keys.ArrowLeft && keys.ArrowRight) {
      triggerDualPower();
    } else {
      if (e.code === 'ArrowLeft') triggerLeftPower();
      if (e.code === 'ArrowRight') triggerRightPower();
    }

    if (e.code === 'Space') {
      e.preventDefault();
      swapCharacter();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp') keys.ArrowUp = false;
    if (e.code === 'ArrowDown') keys.ArrowDown = false;
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;

    if (e.code === 'ArrowRight') {
      keys.ArrowRight = false;
      if (player.power === 'solar') {
        isSunBarrier = false;
      }
    }
  });

  function startApp(heroType) {
    if (heroType === 'thunderwings') {
      heroColor = '#0088ff';
      player.power = 'thunder';
    } else if (heroType === 'solarflair') {
      heroColor = '#ffee00';
      player.power = 'solar';
    }

    if (charSelect) charSelect.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    gameRunning = true;
    requestAnimationFrame(gameLoop);
  }

  function swapCharacter() {
    if (!gameRunning) return;

    if (player.power === 'thunder') {
      player.power = 'solar';
      heroColor = '#ffee00';
    } else {
      player.power = 'thunder';
      heroColor = '#0088ff';
      isSunBarrier = false;
    }
  }

  if (btnThunder) btnThunder.addEventListener('click', () => startApp('thunderwings'));
  if (btnSolar) btnSolar.addEventListener('click', () => startApp('solarflair'));

  // 1. Offense (Left Arrow)
  function triggerLeftPower() {
    if (!gameRunning) return;

    if (player.power === 'thunder') {
      pellets.push({
        x: player.x + player.width,
        y: player.y + 8,
        width: 6,
        height: 4,
        speed: 10,
        damage: 1
      });
    } else if (player.power === 'solar') {
      solarPulses.push({
        x: player.x + player.width,
        y: player.y + 2,
        width: 20,
        height: 16,
        speed: 12,
        damage: 2
      });
    }
  }

  // 2. Defense/Utility (Right Arrow)
  function triggerRightPower() {
    if (!gameRunning) return;

    if (player.power === 'thunder') {
      player.isFlapping = true;
      player.flapTimer = 20;

      windWaves.push({
        x: player.x + player.width,
        y: player.y - 10,
        width: 15,
        height: 40,
        speed: 8
      });
    } else if (player.power === 'solar') {
      isSunBarrier = true;
      sunBarrierHits = 3;
    }
  }

  // 3. Ultimate (Left + Right Arrow Together)
  function triggerDualPower() {
    if (!gameRunning) return;

    if (player.power === 'thunder') {
      // Lightning Dash
      if (!player.isDashing) {
        player.isDashing = true;
        player.dashTimer = 25;
      }
    } else if (player.power === 'solar') {
      // Solar Flash
      flashTimer = 10;
      obstacles.forEach(obs => obs.speed = 0);
      bossProjectiles.forEach(proj => proj.speed = 0);
      boss.isStunned = true;

      setTimeout(() => {
        obstacles.forEach(obs => obs.speed = 3);
        bossProjectiles.forEach(proj => proj.speed = 5);
        boss.isStunned = false;
      }, 2500);
    }
  }

  function spawnObjects() {
    frameCount++;

    if (gameState === 'RUNNING') {
      if (frameCount % 120 === 0) {
        const type = Math.random() < 0.5 ? 'cloud' : 'geese';
        obstacles.push({
          x: canvas.width + 20,
          y: Math.random() * (canvas.height - 100) + 20,
          width: type === 'cloud' ? 35 : 28,
          height: 20,
          type: type,
          speed: 3
        });
      }

      if (frameCount % 150 === 0) {
        const rand = Math.random();
        let selectedType = 'bronze';

        if (rand < 0.40) selectedType = 'bronze';
        else if (rand < 0.65) selectedType = 'silver';
        else if (rand < 0.80) selectedType = 'gold';
        else if (rand < 0.90) selectedType = 'heart';
        else if (rand < 0.95) selectedType = 'shield';
        else selectedType = 'lightning';

        items.push({
          x: canvas.width + 20,
          y: Math.random() * (canvas.height - 100) + 20,
          width: 18,
          height: 18,
          type: selectedType,
          speed: 2.5
        });
      }
    }
  }

  function checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  function updateBossLogic() {
    if (gameState !== 'BOSS_BATTLE') return;

    if (boss.isStunned) return;

    if (boss.x > 660) boss.x -= 2;
    boss.y += Math.sin(frameCount * 0.05) * 1.5;
    boss.attackTimer++;

    if (boss.attackTimer % 180 === 0) {
      if (Math.random() < 0.5) {
        for (let i = 0; i < 3; i++) {
          bossProjectiles.push({
            x: boss.x - 20,
            y: boss.y + 20 + (i * 25),
            width: 25,
            height: 15,
            speed: 5
          });
        }
      } else {
        boss.laserActive = true;
        boss.laserY = player.y;
        setTimeout(() => { boss.laserActive = false; }, 1500);
      }
    }

    bossProjectiles.forEach((proj, index) => {
      proj.x -= proj.speed;

      if (checkCollision(player, proj)) {
        if (player.isDashing) {
          bossProjectiles.splice(index, 1);
        } else if (isSunBarrier && sunBarrierHits > 0) {
          sunBarrierHits--;
          if (sunBarrierHits === 0) isSunBarrier = false;
          bossProjectiles.splice(index, 1);
        } else if (isShielded) {
          isShielded = false;
          bossProjectiles.splice(index, 1);
        } else {
          health -= 0.5;
          bossProjectiles.splice(index, 1);
        }
        if (health <= 0) gameRunning = false;
      } else if (proj.x + proj.width < 0) {
        bossProjectiles.splice(index, 1);
      }
    });

    if (boss.laserActive) {
      if (player.y + player.height > boss.laserY && player.y < boss.laserY + 15) {
        if (!isSunBarrier && !isShielded && !player.isDashing) {
          health -= 0.05;
          if (health <= 0) gameRunning = false;
        }
      }
    }

    if (boss.health <= 0) {
      gameState = 'VICTORY';
      flashTimer = 40;
    }
  }

  function update() {
    if (!gameRunning) return;

    if (flashTimer > 0) flashTimer--;

    if (score >= 100 && gameState === 'RUNNING') {
      gameState = 'BOSS_BATTLE';
      flashTimer = 30;
      obstacles = [];
      items = [];
    }

    // Lightning Dash Mechanics
    if (player.isDashing) {
      player.dashTimer--;
      player.x += 12;

      player.trail.push({
        x: player.x - 10,
        y: player.y + Math.random() * player.height,
        size: 8,
        life: 10
      });

      if (player.dashTimer <= 0) {
        player.isDashing = false;
      }
    } else if (player.x > player.startX) {
      player.x -= 3;
    }

    if (player.isFlapping) {
      player.flapTimer--;
      if (player.flapTimer <= 0) player.isFlapping = false;
    }

    let currentSpeed = player.baseSpeed;
    if (speedBoostTimer > 0) {
      currentSpeed = player.baseSpeed * 1.8;
      speedBoostTimer--;

      player.trail.push({
        x: player.x - 5,
        y: player.y + Math.random() * 10,
        size: 6,
        life: 15
      });
    }

    player.trail.forEach((t, index) => {
      t.x -= 3;
      t.life--;
      if (t.life <= 0) player.trail.splice(index, 1);
    });

    if (keys.ArrowUp && player.y > 0) player.y -= currentSpeed;
    if (keys.ArrowDown && player.y + player.height < canvas.height - 15) player.y += currentSpeed;

    buildings.forEach(b => {
      b.x -= 2;
      if (b.x + b.width < 0) b.x = canvas.width + Math.random() * 20;
    });

    spawnObjects();

    // Thunder Pellets
    pellets.forEach((pellet, pIndex) => {
      pellet.x += pellet.speed;

      if (gameState === 'BOSS_BATTLE' && checkCollision(pellet, boss)) {
        boss.health -= pellet.damage;
        pellets.splice(pIndex, 1);
      }

      obstacles.forEach((obs, oIndex) => {
        if (obs.type === 'geese' && checkCollision(pellet, obs)) {
          obstacles.splice(oIndex, 1);
          pellets.splice(pIndex, 1);
          score += 2;
        }
      });

      if (pellet.x > canvas.width) pellets.splice(pIndex, 1);
    });

    // Solar Pulses
    solarPulses.forEach((pulse, pulseIndex) => {
      pulse.x += pulse.speed;

      if (gameState === 'BOSS_BATTLE' && checkCollision(pulse, boss)) {
        boss.health -= pulse.damage;
        solarPulses.splice(pulseIndex, 1);
      }

      obstacles.forEach((obs, oIndex) => {
        if (checkCollision(pulse, obs)) {
          obstacles.splice(oIndex, 1);
          score += 2;
        }
      });

      if (pulse.x > canvas.width) solarPulses.splice(pulseIndex, 1);
    });

    windWaves.forEach((wave, wIndex) => {
      wave.x += wave.speed;

      obstacles.forEach((obs, oIndex) => {
        if (obs.type === 'cloud' && checkCollision(wave, obs)) {
          obstacles.splice(oIndex, 1);
          score += 2;
        }
      });

      if (wave.x > canvas.width) windWaves.splice(wIndex, 1);
    });

    obstacles.forEach((obs, index) => {
      obs.x -= obs.speed;

      if (checkCollision(player, obs)) {
        if (player.isDashing) {
          obstacles.splice(index, 1);
          score += 2;
        } else if (isSunBarrier && sunBarrierHits > 0) {
          sunBarrierHits--;
          if (sunBarrierHits === 0) isSunBarrier = false;
          obstacles.splice(index, 1);
        } else if (isShielded) {
          isShielded = false;
          obstacles.splice(index, 1);
        } else {
          health -= 0.5;
          obstacles.splice(index, 1);
        }

        if (health <= 0) gameRunning = false;
      } else if (obs.x + obs.width < 0) {
        obstacles.splice(index, 1);
      }
    });

    // Lightning Dash Boss Collision
    if (player.isDashing && gameState === 'BOSS_BATTLE' && checkCollision(player, boss)) {
      boss.health -= 0.5;
    }

    items.forEach((item, index) => {
      item.x -= item.speed;

      if (checkCollision(player, item)) {
        if (item.type === 'bronze') score += 1;
        if (item.type === 'silver') score += 5;
        if (item.type === 'gold') score += 10;
        if (item.type === 'heart') health = Math.min(3.0, health + 1.0);
        if (item.type === 'shield') isShielded = true;
        if (item.type === 'lightning') speedBoostTimer = 600;

        items.splice(index, 1);
      } else if (item.x + item.width < 0) {
        items.splice(index, 1);
      }
    });

    updateBossLogic();
  }

  function drawUI() {
    ctx.fillStyle = '#fff';
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText(`SCORE: ${score}`, 20, 30);

    for (let i = 0; i < 3; i++) {
      let heartX = 680 + (i * 35);
      let heartY = 15;

      if (health >= i + 1) {
        ctx.fillStyle = '#ff0033';
        ctx.fillRect(heartX, heartY, 20, 20);
      } else if (health === i + 0.5) {
        ctx.fillStyle = '#ff0033';
        ctx.fillRect(heartX, heartY, 10, 20);
        ctx.fillStyle = '#444';
        ctx.fillRect(heartX + 10, heartY, 10, 20);
      } else {
        ctx.fillStyle = '#444';
        ctx.fillRect(heartX, heartY, 20, 20);
      }
    }

    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.fillText(`[←] ${player.power === 'thunder' ? 'SEED SHOT' : 'SOLAR PULSE'}`, 20, 55);
    ctx.fillText(`[→] ${player.power === 'thunder' ? 'SUPER FLAP' : 'SUN BARRIER'}`, 20, 70);
    ctx.fillText(`[←+→] ${player.power === 'thunder' ? 'LIGHTNING DASH' : 'SOLAR FLASH'}`, 20, 85);
    ctx.fillText(`[SPACE] SWAP: ${player.power.toUpperCase()}`, 20, 100);

    if (gameState === 'BOSS_BATTLE') {
      ctx.fillStyle = '#222';
      ctx.fillRect(250, 15, 300, 20);
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(250, 15, Math.max(0, (boss.health / boss.maxHealth) * 300), 20);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(250, 15, 300, 20);

      ctx.fillStyle = '#fff';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText('GOOSE KING 👑🪿', 345, 30);
    }

    if (gameState === 'VICTORY') {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffee00';
      ctx.font = '28px "Courier New", monospace';
      ctx.fillText('VICTORY! GOOSE KING DEFEATED!', 160, 180);
    }

    if (!gameRunning && health <= 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ff0033';
      ctx.font = '30px "Courier New", monospace';
      ctx.fillText('GAME OVER', 320, 180);

      ctx.fillStyle = '#fff';
      ctx.font = '16px "Courier New", monospace';
      ctx.fillText(`FINAL SCORE: ${score}`, 330, 220);
      ctx.fillText('Refresh page to play again!', 270, 260);
    }
  }

  function draw() {
    ctx.fillStyle = '#0f0c29';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    buildings.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, canvas.height - b.height, b.width, b.height);

      ctx.fillStyle = '#ffea00';
      for (let wy = canvas.height - b.height + 15; wy < canvas.height - 20; wy += 30) {
        for (let wx = b.x + 10; wx < b.x + b.width - 15; wx += 20) {
          ctx.fillRect(wx, wy, 8, 12);
        }
      }
    });

    ctx.fillStyle = '#111';
    ctx.fillRect(0, canvas.height - 15, canvas.width, 15);

    player.trail.forEach(t => {
      ctx.fillStyle = player.isDashing ? '#ffffff' : '#00ffff';
      ctx.fillRect(t.x, t.y, t.size, t.size);
    });

    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);

    if (player.isFlapping) {
      let angle = (player.flapTimer > 10) ? -Math.PI / 4 : 0;
      ctx.rotate(angle);
    }

    ctx.fillStyle = player.isDashing ? '#ffffff' : heroColor;
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

    ctx.fillStyle = '#ff0033';
    ctx.fillRect(-player.width / 2 - 8, -player.height / 2 + 4, 8, 12);

    ctx.fillStyle = '#ff9900';
    ctx.fillRect(player.width / 2, -player.height / 2 + 6, 6, 6);

    ctx.restore();

    if (isShielded) {
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x + player.width/2, player.y + player.height/2, 24, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (isSunBarrier && sunBarrierHits > 0) {
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(player.x + player.width/2, player.y + player.height/2, 26, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffcc00';
    pellets.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));

    ctx.fillStyle = '#ff4400';
    solarPulses.forEach(sp => ctx.fillRect(sp.x, sp.y, sp.width, sp.height));

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    windWaves.forEach(w => ctx.fillRect(w.x, w.y, w.width, w.height));

    obstacles.forEach(obs => {
      if (obs.type === 'cloud') {
        ctx.fillStyle = '#454647';
        ctx.fillRect(obs.x, obs.y + 5, 35, 12);
        ctx.fillRect(obs.x + 8, obs.y, 20, 20);
      } else {
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(obs.x, obs.y + 5, 6, 4);
        ctx.fillRect(obs.x + 10, obs.y, 6, 4);
        ctx.fillRect(obs.x + 20, obs.y + 10, 6, 4);
      }
    });

    if (gameState === 'BOSS_BATTLE') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(boss.x, boss.y + 20, 80, 60);

      ctx.fillRect(boss.x - 20, boss.y, 35, 40);

      ctx.fillStyle = '#ff9900';
      ctx.fillRect(boss.x - 40, boss.y + 15, 20, 15);

      ctx.fillStyle = '#ffd700';
      ctx.fillRect(boss.x - 15, boss.y - 20, 30, 20);
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(boss.x - 10, boss.y - 15, 6, 6);
      ctx.fillRect(boss.x + 4, boss.y - 15, 6, 6);

      bossProjectiles.forEach(proj => {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(proj.x, proj.y, proj.width, proj.height);
      });

      if (boss.laserActive) {
        ctx.fillStyle = 'rgba(255, 0, 85, 0.7)';
        ctx.fillRect(0, boss.laserY, canvas.width, 15);
      }
    }

    items.forEach(item => {
      if (item.type === 'bronze') ctx.fillStyle = '#cd7f32';
      else if (item.type === 'silver') ctx.fillStyle = '#c0c0c0';
      else if (item.type === 'gold') ctx.fillStyle = '#ffd700';
      else if (item.type === 'heart') ctx.fillStyle = '#ff0055';
      else if (item.type === 'shield') ctx.fillStyle = '#00ff88';
      else if (item.type === 'lightning') ctx.fillStyle = '#ffff00';

      ctx.fillRect(item.x, item.y, 14, 14);
    });

    if (flashTimer > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashTimer / 10})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawUI();
  }

  function gameLoop() {
    update();
    draw();
    if (gameRunning) {
      requestAnimationFrame(gameLoop);
    }
  }
});