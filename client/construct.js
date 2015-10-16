var Objects = new Mongo.Collection('objects');
// https://github.com/josdirksen/learning-threejs/blob/master/chapter-09/07-first-person-camera.html

class Construct {
  constructor($container) {
    this.scene = new THREE.Scene();
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    this.initKeyboard();
    this.initCamera();
    this.initMouse();
    this.initRenderer();
    this.initEvents();
    this.initLight();
    this.initFloor();

    $container.append(this.renderer.domElement);
  }

  initKeyboard() {
    var self = this;
    this.prevTime = performance.now();
    this.velocity = new THREE.Vector3();
    var onKeyUp = function (event) {
      switch( event.keyCode ) {

      case 38: // up
      case 87: // w
        self.moveForward = false;
        break;

      case 37: // left
      case 65: // a
        self.moveLeft = false;
        break;

      case 40: // down
      case 83: // s
        self.moveBackward = false;
        break;

      case 39: // right
      case 68: // d
        self.moveRight = false;
        break;
      }
    };

    var onKeyDown = function (event) {
      switch ( event.keyCode ) {
      case 38: // up
      case 87: // w
        console.log('moving forward');
        self.moveForward = true;
        break;

      case 37: // left
      case 65: // a
        self.moveLeft = true; break;

      case 40: // down
      case 83: // s
        self.moveBackward = true;
        break;

      case 39: // right
      case 68: // d
        self.moveRight = true;
        break;
      }
    };

    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );

  }

  initMouse() {
    this.controlsEnabled = false;
    var havePointerLock = (
      'pointerLockElement' in document ||
        'mozPointerLockElement' in document ||
        'webkitPointerLockElement' in document);

    if (havePointerLock) {
      this.controls = new THREE.PointerLockControls(this.camera);
      this.scene.add(this.controls.getObject());
      var element = document.body;

      var self = this;
      function pointerlockchange(event) {
        if (document.pointerLockElement === element) {
          this.controlsEnabled = true;
          self.controls.enabled = true;
        } else {
          self.controls.enabled = false;
        }
      };

      var pointerlockerror = function ( event ) {
      };

      // Hook pointer lock state change events
      document.addEventListener( 'pointerlockchange', pointerlockchange, false );
      document.addEventListener( 'pointerlockerror', pointerlockerror, false );
      element.addEventListener( 'click', function ( event ) {
        // Ask the browser to lock the pointer
        element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
        element.requestPointerLock();
      }, false );

    } else {
      console.error('no pointerlock');
    }

  }

  initCamera() {
    var [VIEW_ANGLE, ASPECT] = [45, this.screenWidth / this.screenHeight];
    var [NEAR, FAR] = [.1, 20000];
    this.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
    // this.camera.position.set(0, 150, 400);

    // this.camera.lookAt(this.scene.position);
  }

  initRenderer() {
    if (Detector.webgl) {
      this.renderer = new THREE.WebGLRenderer( {antialias: true} );
    } else {
      this.renderer = new THREE.CanvasRenderer();
    }
    this.renderer.setSize(this.screenWidth, this.screenHeight);
  }

  initEvents() {
    THREEx.WindowResize(this.renderer, this.camera);
    THREEx.FullScreen.bindKey({charCode: 'm'.charCodeAt(0)});
  }

  initLight() {
    this.light = new THREE.PointLight(0xffffff);
    this.light.position.set(0, 250, 0);
    this.scene.add(this.light);
  }

  initFloor() {
    var floorTexture = new THREE.ImageUtils.loadTexture(
      '/checkerboard.jpg');
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set( 10, 10 );
    var floorMaterial = new THREE.MeshBasicMaterial( { map: floorTexture, side: THREE.DoubleSide } );
    var floorGeometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.position.y = -0.5;
    this.floor.rotation.x = Math.PI / 2;
    this.scene.add(this.floor);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  update() {
    var time = performance.now();
    var delta = (time - this.prevTime) / 1000;

    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;

    if (this.moveForward) {
      this.velocity.z -= 400.0 * delta;
    }
    if (this.moveBackward) {
      this.velocity.z += 400.0 * delta;
    }

    if (this.moveLeft) {
      this.velocity.x -= 400.0 * delta;
    }
    if (this.moveRight) {
      this.velocity.x += 400.0 * delta;
    }

    this.controls.getObject().translateX( this.velocity.x * delta );
    this.controls.getObject().translateY( this.velocity.y * delta );
    this.controls.getObject().translateZ( this.velocity.z * delta );

    this.prevTime = time;
  }

}



Template.hello.onRendered(function () {
  var $container = this.$('.world');
  var construct = new Construct($container);
  function animate() {
    requestAnimationFrame(animate);
    construct.render();
    construct.update();
  }
  animate();
});
