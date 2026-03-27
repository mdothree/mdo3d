import * as THREE from 'three';

/**
 * 3D Card Renderer using Three.js
 * Creates mystical 3D card effects
 */

export class CardRenderer3D {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.cards = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.init();
  }

  init() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf9fafb);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x8B5CF6, 1, 100);
    pointLight1.position.set(5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xEC4899, 0.8, 100);
    pointLight2.position.set(-5, -5, 5);
    this.scene.add(pointLight2);

    // Add mystical particles
    this.addParticles();

    // Event listeners
    window.addEventListener('resize', () => this.onWindowResize());
    this.container.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.container.addEventListener('click', (e) => this.onCardClick(e));

    // Start animation loop
    this.animate();
  }

  addParticles() {
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 100;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 10;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x8B5CF6,
      transparent: true,
      opacity: 0.6
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    this.scene.add(particlesMesh);

    // Animate particles
    this.particles = particlesMesh;
  }

  createCardDeck(cardCount = 7) {
    // Clear existing cards
    this.cards.forEach(card => this.scene.remove(card.mesh));
    this.cards = [];

    const cardWidth = 1.4;
    const cardHeight = 2.2;
    const spacing = 0.3;
    const totalWidth = (cardWidth + spacing) * cardCount - spacing;
    const startX = -totalWidth / 2 + cardWidth / 2;

    for (let i = 0; i < cardCount; i++) {
      const card = this.createCard(cardWidth, cardHeight);
      
      card.mesh.position.x = startX + i * (cardWidth + spacing);
      card.mesh.position.y = 0;
      card.mesh.position.z = 0;
      
      card.index = i;
      card.originalPosition = card.mesh.position.clone();
      card.isRevealed = false;

      this.cards.push(card);
      this.scene.add(card.mesh);

      // Entrance animation
      card.mesh.scale.set(0, 0, 0);
      this.animateCardEntrance(card, i * 100);
    }
  }

  createCard(width, height) {
    const geometry = new THREE.BoxGeometry(width, height, 0.05);
    
    // Create materials for front and back
    const materials = [
      new THREE.MeshPhongMaterial({ color: 0x8B5CF6 }), // Right
      new THREE.MeshPhongMaterial({ color: 0x8B5CF6 }), // Left
      new THREE.MeshPhongMaterial({ color: 0x8B5CF6 }), // Top
      new THREE.MeshPhongMaterial({ color: 0x8B5CF6 }), // Bottom
      new THREE.MeshPhongMaterial({ 
        color: 0xffffff,
        emissive: 0x8B5CF6,
        emissiveIntensity: 0.2
      }), // Front (card face)
      new THREE.MeshPhongMaterial({ 
        color: 0x8B5CF6,
        emissive: 0xEC4899,
        emissiveIntensity: 0.3
      })  // Back
    ];

    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return { mesh, geometry, materials };
  }

  animateCardEntrance(card, delay) {
    setTimeout(() => {
      const startTime = Date.now();
      const duration = 500;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const eased = 1 - Math.pow(1 - progress, 3);
        
        card.mesh.scale.set(eased, eased, eased);
        card.mesh.rotation.y = (1 - eased) * Math.PI * 2;

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    }, delay);
  }

  onMouseMove(event) {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast to detect hovered cards
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.cards.map(c => c.mesh)
    );

    // Reset all cards
    this.cards.forEach(card => {
      if (!card.isRevealed && !card.isHovered) {
        card.mesh.position.y = card.originalPosition.y;
        card.mesh.rotation.x = 0;
      }
      card.isHovered = false;
    });

    // Highlight hovered card
    if (intersects.length > 0) {
      const hoveredCard = this.cards.find(c => c.mesh === intersects[0].object);
      if (hoveredCard && !hoveredCard.isRevealed) {
        hoveredCard.isHovered = true;
        hoveredCard.mesh.position.y = hoveredCard.originalPosition.y + 0.3;
        hoveredCard.mesh.rotation.x = Math.sin(Date.now() * 0.003) * 0.1;
        this.container.style.cursor = 'pointer';
      }
    } else {
      this.container.style.cursor = 'default';
    }
  }

  onCardClick(event) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.cards.map(c => c.mesh)
    );

    if (intersects.length > 0) {
      const clickedCard = this.cards.find(c => c.mesh === intersects[0].object);
      if (clickedCard && !clickedCard.isRevealed) {
        this.revealCard(clickedCard);
      }
    }
  }

  revealCard(card) {
    card.isRevealed = true;
    
    // Flip animation
    const startRotation = card.mesh.rotation.y;
    const targetRotation = startRotation + Math.PI;
    const startTime = Date.now();
    const duration = 600;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing
      const eased = progress < 0.5 
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      card.mesh.rotation.y = startRotation + (targetRotation - startRotation) * eased;
      card.mesh.position.y = card.originalPosition.y + Math.sin(progress * Math.PI) * 0.5;

      // Add glow effect when revealed
      if (progress > 0.5) {
        card.materials[4].emissiveIntensity = 0.5 * (1 - (progress - 0.5) * 2);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Dispatch custom event when card is revealed
        const event = new CustomEvent('cardRevealed', { 
          detail: { index: card.index } 
        });
        this.container.dispatchEvent(event);
      }
    };

    animate();
  }

  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Rotate particles
    if (this.particles) {
      this.particles.rotation.y += 0.001;
      this.particles.rotation.x += 0.0005;
    }

    // Subtle camera movement
    this.camera.position.x = Math.sin(Date.now() * 0.0002) * 0.1;
    this.camera.position.y = Math.cos(Date.now() * 0.0003) * 0.1;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    window.removeEventListener('resize', () => this.onWindowResize());
    this.container.removeChild(this.renderer.domElement);
    this.renderer.dispose();
  }

  reset() {
    this.cards.forEach(card => {
      this.scene.remove(card.mesh);
      card.geometry.dispose();
      card.materials.forEach(mat => mat.dispose());
    });
    this.cards = [];
  }
}
