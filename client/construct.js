import Editor from '../imports/editor.js';
import CurrentUser from '../imports/current-user.js';
import ProgramHelpers from '../imports/program-helpers.js';
import MathHelpers from '../imports/math-helpers.js';
import Eval from '../imports/eval.js';
import RTC from '../imports/rtc.js';
import Adapter from 'webrtc-adapter';

var Programs = new Mongo.Collection('programs');
// https://github.com/josdirksen/learning-threejs/blob/master/chapter-09/07-first-person-camera.html

Session.set('editorReady', false);

var construct = null;


var MODULE = ProgramHelpers.MODULE;
var USER = ProgramHelpers.USER;
var radianToDegree = MathHelpers.radianToDegree;

Accounts.ui.config({
  passwordSignupFields: 'USERNAME_AND_EMAIL'
});

Meteor.subscribe('all-programs');

class Construct {
  constructor($container, user) {
    console.log('initializing the construct');
    this.eval = new Eval(Programs);
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
    this.initPrograms();
    this.initCamera();
    this.initMouse();
    this.initCurrentUser();
    this.initGLRenderer();

    this.initWebVR();
    this.initEvents();
    this.initEditor();

    this.$container.append(this.glRenderer.domElement);
    Session.set('constructReady', true);
  }

  initEditor() {
    var self = this;
    self.editor = new Editor('#editor', Programs);
    Session.set('editorReady', true);

    Tracker.autorun(() => {
      console.log('object selection changed!');
      if (self.objectSelector.selectedObject.get() && self.editor.isLoaded) {
        var selectedProgramId = self.objectSelector.selectedObject.get().programId;
        var selectedProgram = Tracker.nonreactive(() => {
          return Programs.findOne(selectedProgramId);
        });
        Tracker.nonreactive(() => {
          self.editor.setProgram(selectedProgram);
        });
      } else if (self.editor.isLoaded) {
        self.editor.clear();
      }
    }, () => {console.log('problem in the autorun'); });

    // kind of a hack to handle this event here
    // but blaze doesn't allow for key events
    // on non-input fields
    $(document).keypress((event) => {
      if (event.which === 101 && !self.editor.isActive.get()) {
        self.activateEditor();
      }
    });
  }

  activateEditor() {
    this.currentUser.movementDisabled = true;
    this.editor.activate();
  }

  deactivateEditor() {
    this.currentUser.movementDisabled = false;
    this.editor.deactivate();
  }

  removeRenderedObjects(programId) {
    var self = this;
    _.each(self.renderedObjects[programId], (renderedObject) => {
      // since we store the update function in renderedObjects dictionary
      // for a program
      if (!_.isFunction(renderedObject)) {
        self.scene.remove(renderedObject);
      }
    });
    delete self.renderedObjects[programId];
  }

  initPrograms() {
    var self = this;

    // observe to load any new programs that get created by other users
    Programs.find().observeChanges({
      added: (programId) => {
        var program = Programs.findOne(programId);
        if (program.type && program.type === 'user' &&
            program.userId === Meteor.userId()) {
          self.userProgramId = program._id;
        }
        if (program.type !== MODULE) {
          self.initProgram(program);
        }
      },
      changed: (programId, changedFields) => {
        var updatedProgram = Programs.findOne(programId);
        if (updatedProgram.type === MODULE) {
          self.eval.evalModule(updatedProgram);
        }
        // don't re-initialize a user's program for changes in movement
        // since program is updated whenever a user is moving
        else if (updatedProgram.type !== USER ||
                 !ProgramHelpers.onlyMovementAttributes(_.keys(changedFields))) {
          self.removeRenderedObjects(updatedProgram._id);
          self.initProgram(updatedProgram);
          if (self.editor.isActive.get() && self.editor.program.get()._id === updatedProgram._id) {
            self.editor.setProgram(updatedProgram);
          }
        }
      },
      removed: (oldProgramId) => {
        self.removeRenderedObjects(oldProgramId);
      }
    });
  }

  initProgram(program) {
    var self = this;
    try {
      var initializeProgram = self.eval.evalProgramWithDependencies(
        program.initialize, program);

      var programRenderedObjects = initializeProgram(
        program, self.renderedObjects);

      programRenderedObjects.updateProgram = eval(program.update);

      _.each(programRenderedObjects, (renderedObject) => {
        if (!_.isFunction(renderedObject)) {
          renderedObject.programId = program._id;
          self.scene.add(renderedObject);
        }
      });

      self.renderedObjects[program._id] = programRenderedObjects;
      if (program._id === self.currentUser.program._id) {
        self.currentUser.renderedMesh = programRenderedObjects.user;

      }

    } catch (error) {
      var errorString = error.message;
      console.warn(
        `Problem initializing program ${program._id}: ${errorString}`);
    }
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
      this.controls.getObject().position.fromArray(
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

  initCurrentUser() {
    var userProgram = Programs.findOne({userId: Meteor.userId()});
    var renderedUser = this.renderedObjects[userProgram._id].user;
    var userControls = this.controls ? this.controls.getObject() : this.camera;
    this.currentUser = new CurrentUser(
      userProgram, renderedUser, userControls, Programs);

    // connect user to peers for real time communication (RTC)
    //this.rtc = new RTC(userProgram._id);
  }

  render() {
    if (this.controls && !this.controls.enabled && Session.get('editorReady') && this.editor.isActive.get()) {
      this.objectSelector.selectObjects(this.scene, this.camera);
    }

    this.vrControls.update();
    this.scene.simulate();
    this.vrEffect.render(this.scene, this.camera);
  }

  update() {
    this.updatePrograms();
    this.currentUser.updateMovement();
    this.updateOtherUserMeshes();
  }

  updateOtherUserMeshes() {
    Programs.find({type: 'user'}).forEach((userProgram) => {
      if (userProgram._id === this.currentUser.program._id) {
        return;
      }
      try {
        var userMesh = this.renderedObjects[userProgram._id].user;
        userMesh.position.fromArray(userProgram.position);
        userMesh.rotation.fromArray(userProgram.rotation);
        userMesh.__dirtyRotation = true;
        userMesh.__dirtyPosition = true;
      } catch (error) {
        console.log('problem updating another user');
      }
    });
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
          _.throttle(() => {
            Programs.update({_id: program._id}, {$set: updatedFields});
          }, 300)();
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
      name: Meteor.user().username + ':' + (new Date()),
      imports: [],
      position: newProgramPosition,
      contributors: [Meteor.user().username],
      man: `Your program's manual!  Add help info here`,
      initialize:
      `
(self) => {
  var geometry = new THREE.SphereGeometry(4, 10, 10);
  var material = new THREE.MeshBasicMaterial({color: '#00FF00', wireframe: true});
  var position = self.position;
  var sphere = new THREE.Mesh(geometry, material);
  sphere.position.fromArray(position);
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
      type: MODULE,
      name: `${Meteor.user().username}:module:${new Date()}`,
      imports: [],
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
  module.position.fromArray(position);
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
      construct.update();
      construct.render();
    }
    animate();
  });

});

Template.position.helpers({
  userPosition: () => {
    var userProgram = Programs.findOne({type: 'user', userId: Meteor.userId()});
    if (userProgram) {
      var position = new THREE.Vector3().fromArray(userProgram.position);
      return `${Math.round(position.x)}, ${Math.round(position.z)}, ${Math.round(position.y)}`;
    } else {
      return 'position not found';
    }
  },
  userRotation: () => {
    var userProgram = Programs.findOne({type: 'user', userId: Meteor.userId()});
    if (userProgram) {
      return `${Math.round(radianToDegree(userProgram.rotation[0]))}, ${Math.round(radianToDegree(userProgram.rotation[2]))}, ${Math.round(radianToDegree(userProgram.rotation[1]))}`;
    } else {
      return 'rotation not found';
    }
  }
});

Template.hud.helpers({
  getMouseView: () => {
    return Session.get('mouseView');
  },
  editorOpen: () => {
    if(Session.get('editorReady')) {
      return construct.editor.isActive.get();
    }
    return false;
  },
  editorReady: () => {
    return Session.get('editorReady');
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
    construct.deactivateEditor();
    Session.set('mouseView', true);
    var element = $('.world')[0];
    element.requestPointerLock = (
      element.requestPointerLock || element.mozRequestPointerLock ||
        element.webkitRequestPointerLock);
    element.requestPointerLock();
  },
  'click .open-editor': () => {
    construct.activateEditor();
  },
  'click .close-editor': () => {
    construct.deactivateEditor();
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
  'click .module-code': () => {
    construct.editor.setActiveSection(construct.editor.MODULE_CODE);
  },
  'click .attributes': () => {
    construct.editor.setActiveSection(construct.editor.ATTRIBUTES);
  },
  'change .program-selector': (event) => {
    var programId = event.target.value;
    var program = Programs.findOne(programId);
    construct.editor.setProgram(program);
    construct.editor.setActiveSection(construct.editor.ATTRIBUTES);
  },
  'click .delete-program': () => {
    // there is an observeChanges on Programs that removes the rendered
    // objects when the document is removed
    construct.editor.deleteProgram();
  },
  'click .copy-program': () => {
    construct.editor.copyProgram(
      Programs.findOne(construct.userProgramId).position);
  },
  'change .program-name-field': _.debounce((event) => {
    var newName = event.target.value;
    construct.editor.setName(newName);
  }, 300)
});

Template.editor.helpers({
  programIsSet: () => {
    return Session.get('editorReady') && construct.editor.program.get();
  },
  isModule: () => {
    // need to rerun this AFTER editor is created...
    if(Session.get('editorReady')) {
      var program = construct.editor.program.get();
      return program && program.type === MODULE;
    }
    return false;
  },
  programs: () => {
    var programs = Programs.find({}, {fields: {_id: 1, name: 1}}).map((program) => {
      if (Session.get('editorReady') && construct.editor.program.get() && construct.editor.program.get()._id === program._id) {
        program.selected = 'selected';
      }
      return program;
    });
    return programs;
  }
});
