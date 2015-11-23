ObjectSelector = class ObjectSelector {
  constructor() {
    self = this;
    this.rayCaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    function onMouseMove() {
      self.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      self.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    window.addEventListener('mousemove', onMouseMove, false);
  }

  selectObjects(scene, camera) {
    this.rayCaster.setFromCamera(this.mouse, camera);
    var intersects = this.rayCaster.intersectObjects(scene.children);
    for (var i = 0; i < intersects.length; i++) {
      intersects[i].object.material.color.set( 0xff0000 );
    }
  }
};
