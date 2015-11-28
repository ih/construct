ObjectSelector = class ObjectSelector {
  constructor() {
    self = this;
    this.rayCaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.intersectedObject = null;
    this.selectedObject = null;
    this.selectedObjectOpacity = null;
    this.intersectedObjectOpacity = null;

    function onMouseMove() {
      self.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      self.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    window.addEventListener('mousemove', onMouseMove, false);

    function onClick() {
      if (self.intersectedObject) {
        if (self.selectedObject &&
            self.selectedObject.object !== self.intersectedObject.object) {
          self.unhighlightSelectedObject();
        }
        self.selectedObject = self.intersectedObject;
        self.highlightSelectedObject();
      } else {
        if (self.selectedObject) {
          self.unhighlightSelectedObject();
        }
        self.selectedObject = null;
      }
    }

    window.addEventListener('click', onClick, false);
  }

  selectObjects(scene, camera) {
    this.rayCaster.setFromCamera(this.mouse, camera);
    var intersects = _.filter(
      this.rayCaster.intersectObjects(scene.children), function (
        intersectionObject) {
        return _.has(intersectionObject.object, 'programId');
      });

    // mouse is on a new object so return the old object to its previous state
    // and highlight the new object
    if (intersects.length > 0 && this.intersectedObject !== intersects[0]) {
      if (this.intersectedObject &&
          (!this.selectedObject ||
           this.intersectedObject.object !== this.selectedObject.object)) {
        this.unhighlightIntersectedObject();
      }
      this.intersectedObject = intersects[0];
      if (!this.selectedObject ||
          this.intersectedObject.object !== this.selectedObject.object) {
        this.highlightIntersectedObject();
      }
    } else if (intersects.length === 0 && this.intersectedObject) {
      if (!this.selectedObject ||
          this.intersectedObject.object !== this.selectedObject.object) {
        this.unhighlightIntersectedObject();
      }
      this.intersectedObject = null;
    }

  }

  unhighlightIntersectedObject() {
    this.intersectedObject.object.material.opacity =
      this.intersectedObjectOpacity;
  }

  unhighlightSelectedObject() {
    this.selectedObject.object.material.opacity = this.selectedObjectOpacity;
  }


  highlightIntersectedObject() {
    this.intersectedObjectOpacity =
      this.intersectedObject.object.material.opacity;
    this.intersectedObject.object.material.opacity =
      this.intersectedObjectOpacity / 2;
  }

  // eventually make this add a border to the object
  highlightSelectedObject() {
    if (this.selectedObject !== this.intersectedObject) {
      console.error('selected object is not highlighted???');
    } else {
      this.selectedObjectOpacity = this.intersectedObjectOpacity;
    }
    // this.selectedObjectOpacity =
    //   this.selectedObject.object.material.opacity;
    // this.selectedObject.object.material.opacity =
    //   this.selectedObjectOpacity / 2;
  }
};
