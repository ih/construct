// based on http://adndevblog.typepad.com/cloud_and_mobile/2015/07/embedding-webpages-in-a-3d-threejs-scene.html

Editor = class Editor {
  constructor(width, height, position, rotation, content) {
    console.log('creating editor');
    this.width = width;
    this.height = height;
    this.position = position;
    this.rotation = rotation;
    this.content = content;

    this.plane = this.createPlane();
    this.cssObject = this.createCssObject();
  }

  addToScene(glScene, cssScene) {
    glScene.add(this.plane);
    cssScene.add(this.cssObject);
  }

  createPlane() {
    var material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
    var geometry = new THREE.PlaneGeometry(this.width, this.height);
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = this.position.x;
    mesh.position.y = this.position.y;
    mesh.position.z = this.position.z;
    mesh.rotation.x = this.rotation.x;
    mesh.rotation.y = this.rotation.y;
    mesh.rotation.z = this.rotation.z;
    return mesh;
  }

  createCssObject() {
    var html = `
    <div style="width:' + ${this.width} + 'px; height:' + ${this.height} + 'px;">hello</div>
    `;
    // var html = [
    //   '<div style="width:' + this.width + 'px; height:' + this.height + 'px;">',
    //   '<iframe src="' + this.content + '" width="' + this.width + '" height="' + this.height + '">',
    //   '</iframe>',
    //   '</div>'
    // ].join('\n');
    var div = document.createElement('div');
    $(div).html(html);
    var cssObject = new THREE.CSS3DObject(div);
    cssObject.position.x = this.position.x;
    cssObject.position.y = this.position.y;
    cssObject.position.z = this.position.z;
    cssObject.rotation.x = this.rotation.x;
    cssObject.rotation.y = this.rotation.y;
    cssObject.rotation.z = this.rotation.z;
    return cssObject;
  }

}
