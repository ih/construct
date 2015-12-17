var Programs = new Mongo.Collection('programs');
// https://github.com/josdirksen/learning-threejs/blob/master/chapter-09/07-first-person-camera.html

Meteor.subscribe('all-programs');

class Construct {
  constructor($container, user) {
    console.log('initializing the construct');
    this.scene = new THREE.Scene();
    this.cssScene = new THREE.Scene();
    this.objectSelector = new ObjectSelector('#editor');
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    this.renderedObjects = {};
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

    $container.append(this.cssRenderer.domElement);
    this.cssRenderer.domElement.appendChild(this.glRenderer.domElement);
  }

  initEditor() {
    // this.editor = new Editor();
    var self = this;
    self.editor = new Editor('#editor');


    // if an object is selected load its code into the editor
    Tracker.autorun(() => {
      console.log('object selection changed!');
      if (self.objectSelector.selectedObject.get() && self.editor.isLoaded) {
        var selectedProgramId = self.objectSelector.selectedObject.get().object.programId;
        var selectedProgram = Tracker.nonreactive(() => {
          return Programs.findOne(selectedProgramId);
        });
        Tracker.nonreactive(() => {
          self.editor.loadProgram(selectedProgram);
        });
      } else if (self.editor.isLoaded) {
        self.editor.clear();
      }
    }, () => {console.log('problem in the autorun'); });

    // if init code is edited update the program object
    Tracker.autorun(() => {
      console.log('updating the init function');
      var initializeFunction = self.editor.initializeFunction.get();
      var updateFunction = self.editor.updateFunction.get();
      if (self.editor.currentFunction === self.editor.INITIALIZE) {

        if (initializeFunction) {
          try {
            var changedProgramId = self.editor.programId;
            eval(initializeFunction);
            Programs.update({_id: self.editor.programId}, {$set: {
              initialize: initializeFunction
            }});
            self.removeRenderedObjects(changedProgramId);
            self.initProgram(changedProgramId);
          } catch (error) {
            console.log('problem evaluating change, not saving');
          }
        }
      } else {

        if (updateFunction) {
          try {
            var changedProgramId = self.editor.programId;
            eval(updateFunction);
            Programs.update({_id: self.editor.programId}, {$set: {
              update: updateFunction
            }});
          } catch (error) {
            console.log('problem evaluating change, not saving');
          }
        }
      }
    });
  }

  removeRenderedObjects(programId) {
    var self = this;
    _.each(self.renderedObjects[programId], (renderedObject) => {
      self.scene.remove(renderedObject);
    });
  }

  initPrograms() {
    var self = this;
    Programs.find().forEach((program) => {
      if (program.type && program.type === 'user' &&
          program.userId === Meteor.userId()) {
        self.userProgram = program;
      }
      self.initProgram(program._id);
    });
  }

  initProgram(programId) {
    var self = this;
    var program = Programs.findOne({_id: programId});
    try {
      var initializeProgram = eval(program.initialize);

      var programRenderedObjects = initializeProgram(program);

      _.each(programRenderedObjects, (renderedObject) => {
        renderedObject.programId = program._id;
        self.scene.add(renderedObject);
      });

      programRenderedObjects.updateProgram = eval(program.update);

      self.renderedObjects[program._id] = programRenderedObjects;
    } catch (error) {
      var errorString = JSON.stringify(error);
      console.warn(
        `Problem initializing program ${program._id}: ${errorString}`);
    }
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
      if (event.keyCode === 69 && !self.editor.programId) {
        self.editor.toggle();
        if (!self.editor.isActive) {
          self.objectSelector.unselectAll();

        }
        return;
      } else if (self.editor.isActive) {
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
        self.editor.toggle();
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
      var element = $('.enable-pointer')[0];

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
  }

  initCamera() {
    var [VIEW_ANGLE, ASPECT] = [45, this.screenWidth / this.screenHeight];
    var [NEAR, FAR] = [.1, 20000];
    this.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
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
    if (!this.controls.enabled && this.editor.isActive) {
      this.objectSelector.selectObjects(this.scene, this.camera);
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
        var updatedProgram = updateProgram(self.renderedObjects[program._id], program);
        if (updatedProgram) {
          Programs.update({_id: this.updatedProgram._id}, updatedProgram);
        }
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

  var userLoadedComputation = Tracker.autorun((computation) => {
    var user = Meteor.user();
    var userProgram = Programs.findOne({type: 'user', userId: Meteor.userId()});
    if (user && userProgram) {
      computation.stop();
    }
  });
  userLoadedComputation.onStop(() => {
    // do this here instead of inside the autorun b/c if it was in the autorun
    // stopping that computation stops any nested computations
    var construct = new Construct($container, Meteor.user());

    function animate() {
      requestAnimationFrame(animate);
      construct.render();
      construct.update();
    }
    animate();
  });
});
