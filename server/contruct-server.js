var Programs = new Mongo.Collection('programs');

Programs.allow({
  insert: function (userId, doc) {
    return true;
  },
  update: function (userId, doc) {
    return true;
  },
  remove: function (userId, doc) {
    return true;
  }
});

Meteor.publish('all-programs', function () {
  return Programs.find();
});

Meteor.startup(function () {
  if (Programs.find().count() === 0) {
    console.log('adding init program');
    Programs.insert({
      position: {
        x: -200,
        y: 100,
        z: -100
      },
      initialize:
      `
      (scene, self) => {
        var geometry = new THREE.CubeGeometry(100, 100, 100);
        var material = new THREE.MeshBasicMaterial({color: '#00ff00'});
        var position = self.position;
        var cube = new THREE.Mesh(geometry, material);
        cube.position.set(position.x, position.y, position.z);
        scene.add(cube);
        return {cube: cube};
      }
      `,
      update:
      `
      (renderedObjects) => {
        var cube = renderedObjects['cube'];
        //cube.position.x += 0.0;
      }
      `
    });
  }
  if (Meteor.users.find().count() === 0) {
    console.log('creating the first user');
    Accounts.createUser({
      email: 'architect@construct.club',
      password: 'password'
    });
  }
});


Accounts.onCreateUser(function(options, user) {
  console.log('adding new user program');
  Programs.insert({
    type: 'user',
    userId: user._id,
    position: {
      x: 0,
      y: 5,
      z: 0
    },
    color: Utility.randomColor(),
    initialize:
    `
    (scene, self) => {
      var geometry = new THREE.CubeGeometry(10, 10, 10);
      var material = new THREE.MeshBasicMaterial({color: self.color});
      var position = self.position;
      var cube = new THREE.Mesh(geometry, material);
      cube.position.set(position.x, position.y, position.z);
      scene.add(cube);
      return {user: cube};
      }
    `,
    update:
    `
    (renderedObjects, self) => {
      var user = renderedObjects['user'];
      var deltaX = self.position.x - user.position.x;
      var deltaY = self.position.y - user.position.y;
      var deltaZ = self.position.z - user.position.z;
      user.translateX(deltaX);
      user.translateY(deltaY);
      user.translateZ(deltaZ);
    }
    `
  });


  return user;
});
