export function runMigrations() {

  // update user model
  Migrations.add({
    version: 6,
    up: () => {
      Programs.find({type: 'user'}).forEach(function (program) {
        console.log('migration for adding user head');
        Programs.update(
          program._id,
          {
            $set: {
              initialize:
              `
(self) => {
  var userMaterial = new Physijs.createMaterial(
    new THREE.MeshBasicMaterial({color: self.color}), .8, .2);
  var bodyGeometry = new THREE.CubeGeometry(10, 10, 10);
  var body = new Physijs.BoxMesh(bodyGeometry, userMaterial);
  body.position.fromArray(self.position);
  var headGeometry = new THREE.SphereGeometry(4, 32, 32);
  // based on implementation of PointerLockControls.js
  var headMesh = new Physijs.SphereMesh(headGeometry, userMaterial);
  var pitchObject = new THREE.Object3D();
  pitchObject.add(headMesh);
  var yawObject = new THREE.Object3D();
  yawObject.add(pitchObject);
  yawObject.name = 'head';
  yawObject.position.y += 8;
  body.add(yawObject);

  var eyeGeometry = new THREE.CircleGeometry(1);
  var eyeMaterial = new THREE.MeshBasicMaterial(
    {color: 'black', side: THREE.BackSide});
  var leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);

  var eyeZ = 4;
  var eyeX = 1.5;
  var eyeY = .5;
  var eyeAngleY = Math.PI/6;

  leftEye.position.x += eyeX;
  leftEye.position.y += eyeY;
  leftEye.position.z -= eyeZ;
  leftEye.rotateY(-1 * eyeAngleY);
  headMesh.add(leftEye);

  var rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.x -= eyeX;
  rightEye.position.y += eyeY;
  rightEye.position.z -= eyeZ;
  rightEye.rotateY(eyeAngleY);
  headMesh.add(rightEye);
  return {user: body};
}
              `,
              update:
              `
(renderedObjects, self) => {
  // movement for users is controlled server side
  var user = renderedObjects['user'];
  var yawObject = _.find(user.children, (mesh) => {
    return mesh.name === 'head';
  });

  yawObject.rotation.y = self.headRotation.y;
  var pitchObject = yawObject.children[0];
  pitchObject.rotation.x = self.headRotation.x;

  if (self.isSpeaking) {
    user.material.opacity = .9;
  } else {
    user.material.opacity = 1;
  }
}
              `,
              headRotation: {
                x: 0,
                y: 0
              }
            }
          });
      });
    }
  });

  // change users to have a physijs mesh and add a rotation field
  Migrations.add({
    version: 5,
    up: () => {
      Programs.find({type: 'user'}).forEach(function (program) {
        console.log('migration for adding user physics');
        Programs.update(
          program._id,
          {
            $set: {
              initialize:
              `
              (self) => {
                var geometry = new THREE.CubeGeometry(10, 10, 10);
                // user mesh MUST be a physijs mesh
                var material = new Physijs.createMaterial(
                  new THREE.MeshBasicMaterial({color: self.color}), .8, .2);
                var cube = new Physijs.BoxMesh(geometry, material);
                cube.position.fromArray(self.position);
                return {user: cube};
              }
              `,
              update:
              `
              (renderedObjects, self) => {
                // movement for users is controlled server side
                var user = renderedObjects['user'];
              }
              `,
              rotation: [0, 0, 0]
            }
          });
      });
    }
  });

  // change position to be arrays
  Migrations.add({
    version: 4,
    up: () => {
      Programs.find({position: {$exists: true}}).forEach(function (program) {
        console.log('migration for changing position and rotation into an array');
        Programs.update(
          program._id,
          {
            $set: {position: [
              Math.random() * 100,
              10,
              Math.random() * 100
            ]}
          });
      });
    }
  });

  // add import field to all programs
  Migrations.add({
    version: 3,
    up: () => {
      Programs.find().forEach(function (program) {
        console.log('migration for adding import field to all programs');
        Programs.update(program._id, {$set: {imports: []}});
      });
    }
  });

  // make names unique
  Migrations.add({
    version: 2,
    up: () => {
      var names = {};
      Programs.find().forEach(function (program) {
        console.log('migration for making names unique');
        if (names[program.name]) {
          Programs.update(program._id, {$set: {name: Math.random()*10}});
        } else {
          names[program.name] = true;
        }
      });
    }
  });

  // add man property to programs
  Migrations.add({
    version: 1,
    up: () => {
      Programs.find().forEach(function (program) {
        console.log('migration for adding man field to programs');
        Programs.update(program._id, {$set: {man: 'Your program\'s manual!  Add help info here'}});
      });
    }
  });

}
