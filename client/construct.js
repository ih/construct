var Programs = new Mongo.Collection('programs');
// https://github.com/josdirksen/learning-threejs/blob/master/chapter-09/07-first-person-camera.html

Meteor.subscribe('all-programs');

class Construct {
  constructor($container, user) {
    console.log('initializing the construct');
    this.scene = new THREE.Scene();
    this.cssScene = new THREE.Scene();
    //CX this.rayCaster = new THREE.Raycaster();
    // this.mouse = new THREE.Vector2();
    this.objectSelector = new ObjectSelector();
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    this.renderedObjects = {};
    this.editorActive = false;
    // set by initPrograms
    this.userProgram = null;

    this.initPrograms(user);
    this.initKeyboard();
    this.initCamera();
    this.initMouse();
    this.initGLRenderer();
    this.initCSSRenderer();
    this.initEvents();
    this.initLight();
    this.initFloor();
    this.initEditor();
    // temporary
    //this.createScreen();

    $container.append(this.cssRenderer.domElement);
    this.cssRenderer.domElement.appendChild(this.glRenderer.domElement);
    //$container.append(this.glRenderer.domElement);

  }

  initEditor() {
    self.editor = AceEditor.instance('editor', {
      theme: 'dawn',
      mode: 'javascript'
    }, (editor) => {
      editor.insert('hallo world');
    });
    $('#editor').hide();
  }

  toggleEditor() {
    if (this.editorActive) {
      $('#editor').hide();
      this.editorActive = false;
    } else {
      $('#editor').show();
      this.editorActive = true;
    }
  }

  initPrograms() {
    var self = this;
    Programs.find().forEach((program) => {
      if (program.type && program.type === 'user' &&
          program.userId === Meteor.userId()) {
        self.userProgram = program;
      }
      try {
        var initializeProgram = eval(program.initialize);

        var renderedObjects = initializeProgram(self.scene, program);

        renderedObjects.updateProgram = eval(program.update);

        self.renderedObjects[program._id] = renderedObjects;
      } catch (error) {
        var errorString = JSON.stringify(error);
        console.warn(
          `Problem initializing program ${program._id}: ${errorString}`);
      }
    });
  }

  initKeyboard() {
    var self = this;

    var onKeyUp = (event) => {
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

    var onKeyDown = (event) => {
      if (event.keyCode === 69) {
        self.toggleEditor();
        return;
      } else if (self.editorActive) {
        return;
      }

      switch ( event.keyCode ) {
      case 38: // up
      case 87: // w
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
      case 69: // e
        this.toggleEditor();
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
      this.controls.getObject().position.copy(this.userProgram.position);
      var element = $('.enablePointer')[0];

      var self = this;
      function pointerlockchange(event) {
        if (document.pointerLockElement === element) {
          this.controlsEnabled = true;
          self.controls.enabled = true;
        } else {
          self.controls.enabled = false;
        }
      }

      var pointerlockerror = (event) => {
      };

      // Hook pointer lock state change events
      document.addEventListener('pointerlockchange', pointerlockchange, false);
      document.addEventListener('pointerlockerror', pointerlockerror, false);
      element.addEventListener('click', (event) => {
        // Ask the browser to lock the pointer
        element.requestPointerLock = (
          element.requestPointerLock || element.mozRequestPointerLock ||
            element.webkitRequestPointerLock);
        element.requestPointerLock();
      }, false);

    } else {
      console.error('no pointerlock');
    }

    // // raycaster related
    // function onMouseMove() {
    //   self.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    //   self.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    // }
    // window.addEventListener('mousemove', onMouseMove, false);
  }

  initCamera() {
    var [VIEW_ANGLE, ASPECT] = [45, this.screenWidth / this.screenHeight];
    var [NEAR, FAR] = [.1, 20000];
    this.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);

    // this.camera.lookAt(this.scene.position);
  }

  initGLRenderer() {
    if (Detector.webgl) {
      this.glRenderer = new THREE.WebGLRenderer( {antialias: true, alpha: true} );
    } else {
      this.glRenderer = new THREE.CanvasRenderer();
    }
    this.glRenderer.setSize(this.screenWidth, this.screenHeight);
    this.glRenderer.domElement.style.position = 'absolute';
    this.glRenderer.domElement.style.top = 0;
    this.glRenderer.domElement.style.zIndex = 1;
  }

  initCSSRenderer() {
    this.cssRenderer = new THREE.CSS3DRenderer();
    this.cssRenderer.setSize(this.screenWidth, this.screenHeight);
    this.cssRenderer.domElement.style.position = 'absolute';
    this.cssRenderer.domElement.style.zIndex = 0;
    this.cssRenderer.domElement.style.top = 0;
  }

  initEvents() {
    THREEx.WindowResize(this.cssRenderer, this.camera);
    THREEx.WindowResize(this.glRenderer, this.camera);
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
    var floorMaterial = new THREE.MeshBasicMaterial({
      map: floorTexture,
      side: THREE.DoubleSide
    });
    var floorGeometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.position.y = -0.5;
    this.floor.rotation.x = Math.PI / 2;
    this.scene.add(this.floor);
  }

  render() {
    if (!this.controls.enabled) {
      this.objectSelector.selectObjects(this.scene, this.camera);
      // this.rayCaster.setFromCamera(this.mouse, this.camera);
      // var intersects = this.rayCaster.intersectObjects(this.scene.children);
      // for (var i = 0; i < intersects.length; i++) {
      //   intersects[i].object.material.color.set( 0xff0000 );
      // }
    }
    this.glRenderer.render(this.scene, this.camera);
    this.cssRenderer.render(this.cssScene, this.camera);
  }

  update() {
    var delta = 1;

    this.updatePrograms();

    if (this.moveForward) {
      this.controls.getObject().translateZ(-delta);
    }
    if (this.moveBackward) {
      this.controls.getObject().translateZ(delta);
    }

    if (this.moveLeft) {
      this.controls.getObject().translateX(-delta);
    }
    if (this.moveRight) {
      this.controls.getObject().translateX(delta);
    }

    if (this.moveForward || this.moveBackward || this.moveLeft ||
        this.moveRight) {
      Programs.update({_id: this.userProgram._id}, {$set: {
        position: this.controls.getObject().position}});
    }
  }

  updatePrograms() {
    var self = this;
    Programs.find().forEach((program) => {
      // this doesn't need to happen each update
      try {
        var updateProgram = self.renderedObjects[program._id].updateProgram;
        updateProgram(self.renderedObjects[program._id], program);
      } catch (error) {
        var errorString = JSON.stringify(error);
        console.log(
          `Problem updating program ${program._id}: ${errorString}`);
      }
    });
  }
}



Template.hello.onRendered(() => {

  var $container = this.$('.world');

  Tracker.autorun((computation) => {
    var user = Meteor.user();
    var userProgram = Programs.findOne({type: 'user', userId: Meteor.userId()});
    if (user && userProgram) {
      computation.stop();
      var construct = new Construct($container, user);
      function animate() {
        requestAnimationFrame(animate);
        construct.render();
        construct.update();
      }
      animate();
    }
  });
});
