import Phaser from 'phaser';

interface Fruit {
  sprite: Phaser.Physics.Arcade.Sprite;
  type: 'apple' | 'pineapple' | 'banana';
  value: number;
}

interface Merchant {
  sprite: Phaser.Physics.Arcade.Sprite;
  speciality: 'apple' | 'pineapple' | 'banana';
  multiplier: number;
}

export class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private flutePower!: boolean;
  private fruits!: Fruit[];
  private merchants!: Merchant[];
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private level: number = 1;
  private levelText!: Phaser.GameObjects.Text;
  private bgMusic!: Phaser.Sound.BaseSound;
  private fluteSound!: Phaser.Sound.BaseSound;
  private portal!: Phaser.Physics.Arcade.Sprite;
  private inventory: { [key: string]: number } = {
    apple: 0,
    banana: 0,
    pineapple: 0
  };
  private inventoryText!: Phaser.GameObjects.Text;
  private shopText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    // Load game assets
    this.load.image('sky', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&q=80');
    this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
    this.load.image('apple', 'https://labs.phaser.io/assets/sprites/apple.png');
    this.load.image('banana', 'https://labs.phaser.io/assets/sprites/banana.png');
    this.load.image('pineapple', 'https://labs.phaser.io/assets/sprites/pineapple.png');
    this.load.image('portal', 'https://labs.phaser.io/assets/sprites/portal.png');
    this.load.image('merchant', 'https://labs.phaser.io/assets/sprites/mushroom.png');
    this.load.spritesheet('kokopelli', 'https://labs.phaser.io/assets/sprites/dude.png', {
      frameWidth: 32,
      frameHeight: 48
    });
    
    // Using real, accessible audio files from mixkit.co (free sound effects)
    this.load.audio('bgMusic', 'gm.mp3');
    this.load.audio('fluteSound', 'gm.mp3');
    this.load.audio('coinSound', 'https://assets.mixkit.co/sfx/preview/mixkit-coin-win-notification-1992.mp3');
  }

  create() {
    // Add background music
    this.bgMusic = this.sound.add('bgMusic', { loop: true, volume: 0.5 });
    this.fluteSound = this.sound.add('fluteSound', { loop: false, volume: 0.7 });
    this.bgMusic.play();

    // Add background
    this.add.image(400, 300, 'sky').setScale(2);

    // Create platforms based on level
    this.createPlatforms();

    // Create player
    this.player = this.physics.add.sprite(100, 450, 'kokopelli');
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);

    // Create portal
    this.portal = this.physics.add.sprite(750, 100, 'portal');
    this.portal.setImmovable(true);
    this.physics.add.collider(this.portal, this.platforms);
    this.physics.add.overlap(this.player, this.portal, this.nextLevel, undefined, this);

    // Player animations
    this.createAnimations();

    // Set up collisions
    this.physics.add.collider(this.player, this.platforms);

    // Set up controls
    this.cursors = this.input.keyboard.createCursorKeys();

    // Add flute power
    this.flutePower = false;
    this.input.keyboard.on('keydown-SPACE', () => {
      this.flutePower = true;
      this.fluteSound.play();
      this.time.delayedCall(1000, () => {
        this.flutePower = false;
      });
    });

    // Create fruits
    this.fruits = [];
    this.createFruits();

    // Create merchants
    this.merchants = [];
    this.createMerchants();

    // Add score text
    this.scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '32px',
      color: '#fff'
    });

    // Add level text
    this.levelText = this.add.text(16, 56, `Level: ${this.level}`, {
      fontSize: '32px',
      color: '#fff'
    });

    // Add inventory text
    this.inventoryText = this.add.text(16, 96, this.getInventoryText(), {
      fontSize: '24px',
      color: '#fff'
    });

    // Add shop text (hidden by default)
    this.shopText = this.add.text(400, 300, '', {
      fontSize: '24px',
      color: '#fff',
      backgroundColor: '#000',
      padding: { x: 10, y: 10 }
    }).setOrigin(0.5).setVisible(false);

    // Add trading key
    this.input.keyboard.on('keydown-E', () => {
      this.tryToTrade();
    });
  }

  createMerchants() {
    const merchantTypes: Array<{ speciality: 'apple' | 'pineapple' | 'banana', multiplier: number }> = [
      { speciality: 'apple', multiplier: 1.5 },
      { speciality: 'banana', multiplier: 1.8 },
      { speciality: 'pineapple', multiplier: 2.0 }
    ];

    // Create merchants at fixed positions
    merchantTypes.forEach((type, index) => {
      const x = 200 + (index * 200);
      const y = 500;

      const merchant: Merchant = {
        sprite: this.physics.add.sprite(x, y, 'merchant'),
        speciality: type.speciality,
        multiplier: type.multiplier
      };

      merchant.sprite.setImmovable(true);
      this.physics.add.collider(merchant.sprite, this.platforms);
      this.physics.add.overlap(this.player, merchant.sprite, () => this.showTradeOption(merchant), undefined, this);
      this.merchants.push(merchant);
    });
  }

  showTradeOption(merchant: Merchant) {
    const fruitCount = this.inventory[merchant.speciality];
    this.shopText.setText(
      `Press E to trade ${fruitCount} ${merchant.speciality}(s)\n` +
      `Merchant offers ${merchant.multiplier}x value!`
    );
    this.shopText.setVisible(true);
  }

  tryToTrade() {
    const nearbyMerchant = this.merchants.find(merchant => 
      Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        merchant.sprite.x, merchant.sprite.y
      ) < 100
    );

    if (nearbyMerchant) {
      const fruitCount = this.inventory[nearbyMerchant.speciality];
      if (fruitCount > 0) {
        const baseValue = fruitCount * this.getFruitValue(nearbyMerchant.speciality);
        const bonus = Math.floor(baseValue * nearbyMerchant.multiplier);
        this.score += bonus;
        this.inventory[nearbyMerchant.speciality] = 0;
        this.scoreText.setText(`Score: ${this.score}`);
        this.inventoryText.setText(this.getInventoryText());
        this.sound.add('coinSound').play();
      }
    }
    this.shopText.setVisible(false);
  }

  getFruitValue(type: string): number {
    const values = {
      apple: 10,
      banana: 20,
      pineapple: 30
    };
    return values[type as keyof typeof values];
  }

  getInventoryText(): string {
    return `Inventory:\nApples: ${this.inventory.apple}\nBananas: ${this.inventory.banana}\nPineapples: ${this.inventory.pineapple}`;
  }

  createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    
    // Base platform
    this.platforms.create(400, 568, 'ground').setScale(2).refreshBody();

    // Level-specific platforms
    switch (this.level) {
      case 1:
        this.platforms.create(600, 400, 'ground');
        this.platforms.create(50, 250, 'ground');
        this.platforms.create(750, 220, 'ground');
        break;
      case 2:
        this.platforms.create(300, 400, 'ground');
        this.platforms.create(500, 280, 'ground');
        this.platforms.create(700, 160, 'ground');
        break;
      case 3:
        this.platforms.create(200, 450, 'ground');
        this.platforms.create(400, 350, 'ground');
        this.platforms.create(600, 250, 'ground');
        this.platforms.create(800, 150, 'ground');
        break;
    }
  }

  createAnimations() {
    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('kokopelli', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'turn',
      frames: [{ key: 'kokopelli', frame: 4 }],
      frameRate: 20
    });

    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('kokopelli', { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1
    });
  }

  createFruits() {
    const fruitTypes: Array<{ type: 'apple' | 'pineapple' | 'banana', value: number }> = [
      { type: 'apple', value: 10 },
      { type: 'banana', value: 20 },
      { type: 'pineapple', value: 30 }
    ];

    // Create 5 random fruits
    for (let i = 0; i < 5; i++) {
      const randomFruit = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
      const x = Phaser.Math.Between(50, 750);
      const y = Phaser.Math.Between(100, 300);

      const fruit: Fruit = {
        sprite: this.physics.add.sprite(x, y, randomFruit.type),
        type: randomFruit.type,
        value: randomFruit.value
      };

      this.physics.add.collider(fruit.sprite, this.platforms);
      this.physics.add.overlap(this.player, fruit.sprite, () => this.collectFruit(fruit), undefined, this);
      this.fruits.push(fruit);
    }
  }

  collectFruit(fruit: Fruit) {
    fruit.sprite.destroy();
    this.fruits = this.fruits.filter(f => f !== fruit);
    this.inventory[fruit.type]++;
    this.inventoryText.setText(this.getInventoryText());
  }

  nextLevel() {
    if (this.fruits.length === 0) {
      this.level++;
      if (this.level > 3) {
        this.add.text(400, 300, 'Congratulations! Game Complete!', {
          fontSize: '48px',
          color: '#fff'
        }).setOrigin(0.5);
        this.scene.pause();
      } else {
        // Reset inventory for next level
        this.inventory = {
          apple: 0,
          banana: 0,
          pineapple: 0
        };
        this.scene.restart();
      }
    }
  }

  update() {
    // Player movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
      this.player.anims.play('left', true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160);
      this.player.anims.play('right', true);
    } else {
      this.player.setVelocityX(0);
      this.player.anims.play('turn');
    }

    // Jump
    if (this.cursors.up.isDown && this.player.body.touching.down) {
      this.player.setVelocityY(-330);
    }

    // Flute power effect
    if (this.flutePower) {
      this.player.setTint(0xffff00);
      // Make player jump higher when flute power is active
      if (this.cursors.up.isDown && this.player.body.touching.down) {
        this.player.setVelocityY(-430);
      }
    } else {
      this.player.clearTint();
    }

    // Hide shop text when player moves away from merchant
    if (this.shopText.visible) {
      const nearbyMerchant = this.merchants.find(merchant => 
        Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          merchant.sprite.x, merchant.sprite.y
        ) < 100
      );
      if (!nearbyMerchant) {
        this.shopText.setVisible(false);
      }
    }
  }
}