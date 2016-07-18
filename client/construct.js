import Editor from '../imports/editor.js';

var Programs = new Mongo.Collection('programs');
// https://github.com/josdirksen/learning-threejs/blob/master/chapter-09/07-first-person-camera.html

var construct = null;

Accounts.ui.config({
  passwordSignupFields: 'USERNAME_AND_EMAIL'
});

Meteor.subscribe('all-programs');

class Construct {
  constructor($container, user) {
    console.log('initializing the construct');
    this.initPhysics();

    this.$container = $container;
    this.scene = new Physijs.Scene();
    this.scene.setGravity(new THREE.Vector3(0, -10, 0));

    this.cssScene = new THREE.Scene();
    this.objectSelector = new ObjectSelector('#editor');
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    this.renderedObjects = {};
    // set by initPrograms
    this.userProgramId = null;

    this.initPrograms(user);
    this.initKeyboard();
    this.initCamera();
    this.initMouse();
    this.initGLRenderer();
    //this.initCSSRenderer();
    // in the future attach to $container

    this.initWebVR();
    this.initEvents();
    this.initEditor();

    this.$container.append(this.glRenderer.domElement);
    //this.cssRenderer.domElement.appendChild(this.glRenderer.domElement);
    Session.set('constructReady', true);
  }

  initEditor() {
    var self = this;
    self.editor = new Editor('#editor', Programs);
  }

  initEditorOld() {
    // this.editor = new Editor();
    var self = this;
    self.editor = new Editor('#editor', Programs, this.userProgramId);

    function failedSave(error) {
      //console.log('did not save, reverting program');
      //self.editor.loadProgram(self.editor.programId);
    }
    // if an object is selected load its code into the editor
    Tracker.autorun(() => {
      console.log('object selection changed!');
      if (self.objectSelector.selectedObject.get() && self.editor.isLoaded) {
        var selectedProgramId = self.objectSelector.selectedObject.get().programId;
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

    // keep the selection menu updated
    Tracker.autorun(() => {
      var allProgramsCursor = Programs.find({}, {fields: {_id: 1, name: 1}});
      self.editor.updateProgramSelector(allProgramsCursor);
    });

    // if program name is edited update the program object
    Tracker.autorun(() => {
      var programName = self.editor.programName.get();
      console.log('updating the program name');
      if (!self.editor.programId) {
        console.log('need to select a program before changing the name');
        return null;
      }
      Programs.update({_id: self.editor.programId}, {$set: {
        name: programName
      }}, failedSave);
      return true;
    });
    // if init code is edited update the program object
    Tracker.autorun(() => {

      var initializeFunction = self.editor.initializeFunction.get();
      var updateFunction = self.editor.updateFunction.get();
      var programAttributes = self.editor.programAttributes.get();
      if (self.editor.currentSection === self.editor.INITIALIZE) {
        // console.log('updating the init function');
        if (initializeFunction) {
          try {
            eval(initializeFunction);
            Programs.update({_id: self.editor.programId}, {$set: {
              initialize: initializeFunction
            }}, failedSave);
          } catch (error) {
            console.log(`problem evaluating change, not saving: ${error.message}`);
          }
        }
      } else if (self.editor.currentSection === self.editor.UPDATE) {

        if (updateFunction) {
          try {
            eval(updateFunction);
            Programs.update({_id: self.editor.programId}, {$set: {
              update: updateFunction
            }}, failedSave);
          } catch (error) {
            console.log('problem evaluating change, not saving');
          }
        }
      } else if (self.editor.currentSection === self.editor.ATTRIBUTES) {
        if (programAttributes) {
          try {
            programAttributes = _.omit(JSON.parse(programAttributes), '_id');
            Programs.update({_id: self.editor.programId}, {$set: programAttributes});
          } catch (error) {
            console.log('problem parsing attributes, not saving');
          }

        }
      }
    });

    // initialize program selector
    $(self.editor.programSelectorSelector).change((event) => {
      console.log(event);
      var selectedValue = $(self.editor.programSelectorSelector).val();
      var selectedProgramObject = _.values(_.omit(
        self.renderedObjects[selectedValue], 'updateProgram'))[0];
      console.log('the value selected');
      console.log(selectedValue);
      if (selectedValue === 'None') {
        self.editor.clear();
      }
      else if (selectedProgramObject) {
        // use the object selector which will trigger the program to load
        self.objectSelector.selectObject(selectedProgramObject);
      } else {
        console.log('problem finding rendered objects for ' + selectedValue +
                    ' loading directly');
        var selectedProgram = Programs.findOne(selectedValue);
        self.editor.loadProgram(selectedProgram);
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

    // observe to load any new programs that get created by other users
    Programs.find().observe({
      added: (program) => {
        if (program.type && program.type === 'user' &&
            program.userId === Meteor.userId()) {
          self.userProgramId = program._id;
        }
        self.initProgram(program._id);
      },
      changed: (updatedProgram, originalProgram) => {
          self.removeRenderedObjects(updatedProgram._id);
          self.initProgram(updatedProgram._id);
          if (self.editor.isActive.get() && self.editor.program.get()._id === updatedProgram._id) {
            self.editor.setProgram(updatedProgram);
          }
      },
      removed: (oldProgram) => {
        self.removeRenderedObjects(oldProgram._id);
      }
    });
  }

  initProgram(programId) {
    var self = this;
    var program = Programs.findOne({_id: programId});
    try {
      var initializeProgram = eval(program.initialize);

      var programRenderedObjects = initializeProgram(
        program, self.renderedObjects);

      _.each(programRenderedObjects, (renderedObject) => {
        renderedObject.programId = program._id;
        self.scene.add(renderedObject);
      });

      programRenderedObjects.updateProgram = eval(program.update);

      self.renderedObjects[program._id] = programRenderedObjects;
    } catch (error) {
      var errorString = error.message;
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
      if (event.keyCode === 69 && !self.editor.isActive.get() && !self.controls.enabled) {
        self.editor.toggle();
        if (!self.editor.isActive.get()) {
          self.objectSelector.unselectAll();

        }
        return;
      } else if (self.editor.isActive.get()) {
        return;
      }

      switch ( event.keyCode ) {
      case 67:
        self.createProgram();
        break;
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
      }
    };

    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );

  }

  initMouse() {
    //this.controlsEnabled = false;
    var havePointerLock = (
      'pointerLockElement' in document ||
        'mozPointerLockElement' in document ||
        'webkitPointerLockElement' in document);

    if (havePointerLock) {
      this.controls = new THREE.PointerLockControls(this.camera);
      this.scene.add(this.controls.getObject());
      this.controls.getObject().position.copy(
        Programs.findOne(this.userProgramId).position);
    } else {
      console.warn('no pointerlock');
      //this.controlsEnabled = false;
      this.controls = null;
    }
  }

  initCamera() {
    var [VIEW_ANGLE, ASPECT] = [45, this.screenWidth / this.screenHeight];
    var [NEAR, FAR] = [.1, 1000];
    this.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
  }

  initGLRenderer() {
    this.glRenderer = new THREE.WebGLRenderer( {antialias: true, alpha: true});
    // } else {
    //   this.glRenderer = new THREE.CanvasRenderer();
    // }
    //this.glRenderer.setSize(this.screenWidth, this.screenHeight);
    this.glRenderer.setPixelRatio(window.devicePixelRatio);
    this.glRenderer.setClearColor( 0xffffff );
    this.glRenderer.setSize(this.screenWidth, this.screenHeight);
    this.glRenderer.shadowMap.enabled = true;
  }

  initCSSRenderer() {
    this.cssRenderer = new THREE.CSS3DRenderer();
    this.cssRenderer.setSize(this.screenWidth, this.screenHeight);
    this.cssRenderer.domElement.style.position = 'absolute';
    this.cssRenderer.domElement.style.zIndex = 0;
    this.cssRenderer.domElement.style.top = 0;
  }

  initWebVR() {
    var self = this;
    var fullScreenButton = $('.full-screen')[0];

    if ( navigator.getVRDisplays === undefined && navigator.getVRDevices === undefined ) {

      fullScreenButton.innerHTML = 'Your browser doesn\'t support WebVR';
      fullScreenButton.classList.add('error');

    }
    this.vrControls = new THREE.VRControls(this.camera);
    this.vrEffect = new THREE.VREffect(this.glRenderer, (error) => {
      fullScreenButton.innerHTML = error;
      fullScreenButton.classList.add('error');
    });

    fullScreenButton.onclick = function() {
      self.vrEffect.setFullScreen( true );

    };
    this.vrEffect.setSize(window.innerWidth, window.innerHeight);
  }

  initEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.vrEffect.setSize( window.innerWidth, window.innerHeight );
    }, false);
  }

  initPhysics() {
    Physijs.scripts.worker = 'physijs_worker.js';
    Physijs.scripts.ammo = 'ammo.js';
  }

  render() {
    if (this.controls && !this.controls.enabled && this.editor && this.editor.isActive.get()) {
      this.objectSelector.selectObjects(this.scene, this.camera);
    }

    this.vrControls.update();
    //    this.glRenderer.render(this.scene, this.camera);
    //    this.cssRenderer.render(this.cssScene, this.camera);
    this.vrEffect.render(this.scene, this.camera);
    this.scene.simulate();
  }

  update() {
    var delta = 1;

    this.updatePrograms();

    var user = this.controls ? this.controls.getObject() : this.camera;

    if (this.moveForward) {
      user.translateZ(-delta);
    }
    if (this.moveBackward) {
      user.translateZ(delta);
    }

    if (this.moveLeft) {
      user.translateX(-delta);
    }
    if (this.moveRight) {
      user.translateX(delta);
    }

    if (this.moveForward || this.moveBackward || this.moveLeft ||
        this.moveRight) {
      Programs.update({_id: this.userProgramId}, {$set: {
        position: user.position}});
    }
  }

  updatePrograms() {
    var self = this;
    Programs.find().forEach((program) => {
      // this doesn't need to happen each update
      try {
        var renderedObjects = self.renderedObjects[program._id];
        if (!renderedObjects) {
          return;
        }
        var updateProgram = renderedObjects.updateProgram;
        var updatedFields = updateProgram(
          self.renderedObjects[program._id], program, self.renderedObjects);
        if (updatedFields) {
          Programs.update({_id: program._id}, {$set: updatedFields});
        }
      } catch (error) {
        var errorString = error.message;
        console.log(
          `Problem updating program ${program.name || program._id}: ${errorString}`);
      }
    });
  }

  createProgram() {
    var newProgramPosition = Programs.findOne(this.userProgramId).position;
    // the observer on the collection will render the new program
    var newProgramId = Programs.insert({
      position: {
        x: newProgramPosition.x,
        y: newProgramPosition.y,
        z: newProgramPosition.z
      },
      man: `Your program's manual!  Add help info here`,
      name: Meteor.user().username + ':' + (new Date()),
      contributors: [Meteor.user().username],
      initialize:
      `
(self) => {
  var geometry = new THREE.SphereGeometry(4, 10, 10);
  var material = new THREE.MeshBasicMaterial({color: '#00FF00', wireframe: true});
  var position = self.position;
  var sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(position.x, position.y, position.z);
  return {placeholder: sphere};
}
      `,
      update:
      `
(renderedObjects, self) => {
  var sphere = renderedObjects['placeholder'];
}
      `
    });
  }

  createModule() {
    var newModuleId = Programs.insert({
      man: `This is a module, add a description of it's functionality here.`,
      type: 'module',
      name: `${Meteor.user().username}:module:${new Date()}`,
      imports: [],
      exports: [],
      code: 'Define variables, functions, classes...',
      contributors: [Meteor.user().username],
      // TODO move this to the server
      initialize:
      `
(self) => {
  var geometry = new THREE.DodecahedronGeometry();
  var material = new THREE.MeshNormalMaterial();
  var position = Programs.findOne(this.userProgramId).position;
  var module = new THREE.Mesh(geometry, material);
  module.position.set(position.x + 10, position.y, position.z);
  return {placeholder: module};
}
      `,
      update:
      `
(renderedObjects, self) => {

}
      `
    });
  }
}

Template.construct.onRendered(() => {
  console.log('body rendered');
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
    console.log('creating construct');
    construct = new Construct($container, Meteor.user());
    Session.set('constructInitialized', true);
    construct.render();
    function animate() {
      requestAnimationFrame(animate);
      construct.render();
      construct.update();
    }
    animate();
  });

});

Template.position.helpers({
  userPosition: () => {
    var userProgram = Programs.findOne({type: 'user', userId: Meteor.userId()});
    if (userProgram) {
      return `${Math.round(userProgram.position.x)}, ${Math.round(userProgram.position.z)}, ${Math.round(userProgram.position.y)}`;
    } else {
      return 'position not found';
    }
  }
});

Template.hud.helpers({
  getMouseView: () => {
    return Session.get('mouseView');
  },
  editorOpen: () => {
    if(Session.get('constructReady')) {
      return construct && construct.editor.isActive.get();
    }
    return false;
  }
});

Template.hud.onRendered(() => {
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement) {
      construct.controls.enabled = true;
    } else {
      construct.controls.enabled = false;
      Session.set('mouseView', false);
    }
  }, false);

  document.addEventListener('pointerlockerror', () => {

  }, false);
});

Template.hud.events({
  'click .enable-mouse-view': () => {
    construct.editor.deactivate();
    Session.set('mouseView', true);
    var element = $('.world')[0];
    element.requestPointerLock = (
      element.requestPointerLock || element.mozRequestPointerLock ||
        element.webkitRequestPointerLock);
    element.requestPointerLock();
  },
  'click .open-editor': () => {
    construct.editor.activate();
  },
  'click .close-editor': () => {
    construct.editor.deactivate();
  },
  'click .create-program': () => {
    construct.createProgram();
  },
  'click .create-module': () => {
    construct.createModule();
  }
});


// this is here to get access to the instantiated editor object
// ideally it'd be in the editor module

Template.editor.events({
  'click .initialization-code': () => {
    construct.editor.setActiveSection(construct.editor.INITIALIZE);
  },
  'click .update-code': () => {
    construct.editor.setActiveSection(construct.editor.UPDATE);
  },
  'click .attributes': () => {
    construct.editor.setActiveSection(construct.editor.ATTRIBUTES);
  },
  'change .program-selector': (event) => {
    var programId = event.target.value;
    var program = Programs.findOne(programId);
    construct.editor.setProgram(program);
  },
  'click .delete-program': () => {
    construct.editor.deleteProgram();
  },
  'click .copy-program': () => {
    construct.editor.copyProgram(
      Programs.findOne(construct.userProgramId).position);
  }
});

Template.editor.helpers({
  isModule: () => {
    // need to rerun this AFTER editor is created...
    if(Session.get('constructReady')) {
      //      return construct && construct.editor && construct.editor.program construct.editor.programType.get() === 'module';
    }
  },
  programs: () => {
    return Programs.find({});
  }
});
