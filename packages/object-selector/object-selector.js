ObjectSelector = class ObjectSelector {
  constructor(editorSelector) {
    self = this;
    this.rayCaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.intersectedObject = null;
    this.selectedObject = new ReactiveVar(null, (oldValue, newValue) => {
      if (!oldValue && !newValue) {
        return true;
      } else if (!oldValue || !newValue) {
        return false;
      } else {
        return oldValue.object.programId === newValue.object.programId;
      }
    });
    this.selectedObjectOpacity = null;
    this.intersectedObjectOpacity = null;
    this.editorSelector = editorSelector;

    function onMouseMove(event) {
      self.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      self.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    window.addEventListener('mousemove', onMouseMove, false);

    function onClick(event) {
      // don't do anything if you click on the editor
      if ($(event.target).parents(self.editorSelector).length > 0) {
        return;
      }
      if (self.intersectedObject) {
        if (self.selectedObject.get() &&
            self.selectedObject.get().object !== self.intersectedObject.object) {
          self.unhighlightSelectedObject();
        }
        self.selectedObject.set(self.intersectedObject);
        self.highlightSelectedObject();
      } else {
        if (self.selectedObject.get()) {
          self.unhighlightSelectedObject();
        }
        self.selectedObject.set(null);
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
          (!this.selectedObject.get() ||
           this.intersectedObject.object !== this.selectedObject.get().object)) {
        this.unhighlightIntersectedObject();
      }
      this.intersectedObject = intersects[0];
      if (!this.selectedObject.get() ||
          this.intersectedObject.object !== this.selectedObject.get().object) {
        this.highlightIntersectedObject();
      }
    } else if (intersects.length === 0 && this.intersectedObject) {
      if (!this.selectedObject.get() ||
          this.intersectedObject.object !== this.selectedObject.get().object) {
        this.unhighlightIntersectedObject();
      }
      this.intersectedObject = null;
    }

  }

  unhighlightIntersectedObject() {
    if (!this.intersectedObject) {
      return;
    }
    this.intersectedObject.object.material.opacity =
      this.intersectedObjectOpacity;
  }

  unhighlightSelectedObject() {
    if (!this.selectedObject.get()) {
      return;
    }
    this.selectedObject.get().object.material.opacity = this.selectedObjectOpacity;
  }


  highlightIntersectedObject() {
    this.intersectedObjectOpacity =
      this.intersectedObject.object.material.opacity;
    this.intersectedObject.object.material.opacity =
      this.intersectedObjectOpacity / 2;
  }

  // eventually make this add a border to the object
  highlightSelectedObject() {
    if (this.selectedObject.get().object !== this.intersectedObject.object) {
      console.error('selected object is not highlighted???');
    } else {
      this.selectedObjectOpacity = this.intersectedObjectOpacity;
    }
  }

  unselectAll() {
    this.unhighlightSelectedObject();
    this.unhighlightIntersectedObject();
    this.intersectedObject = null;
    this.selectedObject.set(null);
    this.selectedObjectOpacity = null;
    this.intersectedbjectOpacity = null;
  }
};
