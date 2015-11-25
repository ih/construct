ObjectSelector = class ObjectSelector {
  constructor() {
    self = this;
    this.rayCaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.intersectedObject = null;
    this.intersectedObjectColor = null;

    function onMouseMove() {
      self.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      self.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    window.addEventListener('mousemove', onMouseMove, false);
  }

  selectObjects(scene, camera) {
    this.rayCaster.setFromCamera(this.mouse, camera);
    var intersects = _.filter(
      this.rayCaster.intersectObjects(scene.children), function (intersectionObject) {
        return _.has(intersectionObject.object, 'programId');
      });

    if (intersects.length > 0 && this.intersectedObject !== intersects[0]) {
      if (this.intersectedObject) {
        this.intersectedObject.object.material.color.set(
          this.intersectedObjectColor);
      }
      this.intersectedObject = intersects[0];
      this.intersectedObjectColor =
        this.intersectedObject.object.material.color.getHex();
      this.intersectedObject.object.material.color.set( 0xff0000 );
    } else if (intersects.length === 0 && this.intersectedObject) {
      this.intersectedObject.object.material.color.set(
        this.intersectedObjectColor);
      this.intersectedObject = null;
    }

  }
};
