
var Programs;

export default class CurrentUser {
  constructor(userProgram, renderedUser, userControls, ProgramsCollection) {
    Programs = ProgramsCollection;
    this.program = userProgram;
    this.renderedMesh = renderedUser;
    this.lastRotation = this.renderedMesh.rotation;
    this.controls = userControls;
    this.initKeyboard();
    this.rotateRight = false;
    this.facingDirection = this.renderedMesh.getWorldDirection();
    this.movementDisabled = false;

    // heartbeat is used to update who is online
    setInterval(() => {Meteor.call('heartbeat');}, 5000);
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
    if (this.isMoving(this.renderedMesh)) {
      _.throttle(() => {
        Programs.update({_id: this.program._id}, {$set: {
          position: this.renderedMesh.position.toArray(),
          rotation: this.renderedMesh.rotation.toArray()
        }});
      }, 300)();
    }

    var linearVelocity = this.renderedMesh.getLinearVelocity();
    this.renderedMesh.getWorldDirection(this.facingDirection);
    this.facingDirection.y = 0;

    if (this.moveForward) {
      this.renderedMesh.translateZ(-1);
      // this.renderedMesh.setLinearVelocity(
      //   this.facingDirection.multiplyScalar(10));
    } else if (this.moveBackward) {
            this.renderedMesh.translateZ(1);
      // this.renderedMesh.setLinearVelocity(
      //   this.facingDirection.multiplyScalar(-10));
    } else {
      this.renderedMesh.setLinearVelocity(linearVelocity);
    }
    var oneDegree = Math.PI / 180;

    if (this.rotateRight) {
      // use rotation.y instead of rotateY b/c the pointer control flips
      // horizontally if you turn too far, why?
      this.controls.rotation.y += -2 * oneDegree;
      // use rotateY here instead of directly setting rotation.y b/c
      // it gets stuck turning.  why?
      this.renderedMesh.rotateY(-2 * oneDegree);
    } else if (this.rotateLeft) {
      this.controls.rotation.y += 2 * oneDegree;
      this.renderedMesh.rotateY(2 * oneDegree);
    }
    //this.controls.rotation.x = Math.max( - Math.PI / 2, Math.min( Math.PI / 2, this.controls.rotation.x ) );
    this.renderedMesh.setAngularVelocity(new THREE.Vector3(0, 0, 0));
    this.renderedMesh.__dirtyRotation = true;
    this.renderedMesh.__dirtyPosition = true;
    this.controls.position.copy(this.renderedMesh.position);

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

};
