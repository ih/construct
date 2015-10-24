var Objects = new Mongo.Collection('objects');

Meteor.startup(function () {
  if (Objects.find().count() === 0) {
    console.log('adding init object');
    Objects.insert({
      x: 0,
      y: 0,
      z: 0,
      // needs to be a string
      initialize:
      '(scene) => {' +
        'var geometry = new THREE.CubeGeometry(100, 100, 100);' +
        'var material = new THREE.MeshBasicMaterial({color: 0x00ff00});' +
        'var cube = new THREE.Mesh(geometry, material);' +
        'cube.position.set(-200, 70, -100);' +
        'scene.add(cube);' +
      '}',
      update: function () {
      }
    });
  }
});
