import MeshHelpers from '../imports/mesh-helpers.js';
var Programs;

export default class CurrentUser {
  constructor(userProgram, renderedUser, userControls, ProgramsCollection) {
    Programs = ProgramsCollection;
    this.program = userProgram;
    this.userControls = userControls;
    this.controlsObject = userControls.getObject();

    // this is a function b/c it also needs to be called when the user's
    // program is re-evaluated, which causes a new mesh to be rendered
    this.initMesh(renderedUser);

    this.initKeyboard();
    this.rotateRight = false;
    this.movementDisabled = false;

    // heartbeat is used to update who is online
    var heartBeatInterval = setInterval(() => {
      if (Meteor.userId()) {
        Meteor.call('heartbeat');
      } else {
        clearInterval(heartBeatInterval);
      }
    }, 5000);
  }

  initMesh(renderedUser) {
    this.renderedMesh = renderedUser;
    this.renderedHead = MeshHelpers.getHead(this.renderedMesh);
    this.lastRotation = this.renderedMesh.rotation;
    this.lastHeadRotation = this.getHeadRotation();
    this.renderedMesh.add(this.controlsObject);
    this.controlsObject.position.y = this.renderedHead.position.y;
  }

  initKeyboard() {
    var self = this;

    var onKeyDown = (event) => {
      if (self.movementDisabled) {
        return;
      }
      switch (event.keyCode) {
      case 38: // up
      case 87: // w
        self.moveForward = true;
        break;

      case 37: // left
      case 65: // a
        self.rotateLeft = true;
        break;
      case 40: // down
      case 83: // s
        self.moveBackward = true;
        break;

      case 39: // right
      case 68: // d
        self.rotateRight = true;
        break;
      }
    };

    var onKeyUp = (event) => {
      switch(event.keyCode) {

      case 38: // up
      case 87: // w
        self.moveForward = false;
        break;

      case 37: // left
      case 65: // a
        self.rotateLeft = false;
        break;

      case 40: // down
      case 83: // s
        self.moveBackward = false;
        break;

      case 39: // right
      case 68: // d
        self.rotateRight = false;
        break;
      }
    };

    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
  }

  updateMovement() {
    // if you add properties to be changed make sure to
    // update the ProgramHelpers.onlyMovementAttributes
    // otherwise the init function will be re-run with every update
    var headRotation = this.getHeadRotation();

    // update if head or body is moving
    if (this.isMoving(this.renderedMesh) ||
        this.lastHeadRotation.x !== headRotation.x || this.lastHeadRotation.y !== headRotation.y) {
      _.throttle(() => {
        Programs.update({_id: this.program._id}, {$set: {
          position: this.renderedMesh.position.toArray(),
          rotation: this.renderedMesh.rotation.toArray(),
          headRotation: headRotation
        }});
      }, 300)();
    }

    this.lastHeadRotation = headRotation;

    var linearVelocity = this.renderedMesh.getLinearVelocity();
    if (this.moveForward) {
      this.renderedMesh.translateZ(-1);
    } else if (this.moveBackward) {
            this.renderedMesh.translateZ(1);
    } else {
      this.renderedMesh.setLinearVelocity(linearVelocity);
    }
    var oneDegree = Math.PI / 180;

    if (this.rotateRight) {
      this.renderedMesh.rotateY(-2 * oneDegree);
    } else if (this.rotateLeft) {
      this.renderedMesh.rotateY(2 * oneDegree);
    }

    this.renderedMesh.setAngularVelocity(new THREE.Vector3(0, 0, 0));
    this.renderedMesh.__dirtyRotation = true;
    this.renderedMesh.__dirtyPosition = true;

    // have the camera match the position of the user
    var userControlPosition = this.renderedMesh.position.clone();
    if (this.renderedHead) {
      // move the user's view up to head level if there is a head
      userControlPosition.setFromMatrixPosition(this.renderedHead.matrixWorld);
    }

    // used in calculating the delta between frames
    this.lastLastRotation = this.lastRotation;
    this.lastRotation = this.renderedMesh.rotation;
  }

  isMoving() {
    var keyPressed = this.moveForward || this.moveBackward ||
          this.rotateRight || this.rotateLeft;
    var linearVelocity = this.renderedMesh.getLinearVelocity().toArray();
    var hasLinearVelocity = Math.round(_.max(linearVelocity)) > 0 ||
          Math.round(_.min(linearVelocity)) < 0;
    var currentRotation = this.renderedMesh.rotation;
    var hasAngularVelocity = Math.abs(
      currentRotation._y - this.lastRotation._y) > 0;
    return keyPressed || hasLinearVelocity || hasAngularVelocity;
  }

  getHeadRotation() {
    // the pointerlockcontrols consists of a yaw object and a pitch object
    var yawObject = this.controlsObject;
    var pitchObject = yawObject.children[0];

    return {
      x: pitchObject.rotation.x,
      y: yawObject.rotation.y
    };
  }

};
