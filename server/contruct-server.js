Programs = new Mongo.Collection('programs');

Migrations.add({
  version: 1,
  up: function() {
    Programs.find().forEach(function (program) {
      console.log(program);
      Programs.update(program._id, {$set: {man: 'Your program\'s manual!  Add help info here'}});
    });
  }
});

Programs.allow({
  insert: function (userId, doc) {
    return true;
  },
  update: function (userId, doc, fieldNames) {
    var user = Meteor.users.findOne(userId);
    return _.contains(doc.contributors, user.username) || user.username === 'architect';
  },
  remove: function (userId, doc) {
    var user = Meteor.users.findOne(userId);
    return _.contains(doc.contributors, user.username) || user.username === 'architect';
  }
});

Meteor.publish('all-programs', function () {
  return Programs.find();
});

Meteor.startup(function () {
  Migrations.migrateTo('1,rerun');
  if (Programs.find().count() === 0) {
    console.log('adding init program');
    Programs.insert({
      position: {
        x: -200,
        y: 100,
        z: -100
      },
      man: 'This is the man page.  You can put information here that tells what the program is about and how to use it.',
      initialize:
      `
(self) => {
  var geometry = new THREE.CubeGeometry(100, 100, 100);
  var material = new THREE.MeshBasicMaterial({color: '#00ff00'});
  var position = self.position;
  var cube = new THREE.Mesh(geometry, material);
  cube.position.set(position.x, position.y, position.z);
  cube.direction = 1;
  return {cube: cube};
}
      `,
      update:
      `
(renderedObjects, self) => {
  var cube = renderedObjects['cube'];
  if (cube.position.x > 100) {
    cube.direction = -1;
  } else if (cube.position.x < -100){
    cube.direction = 1;
  }
  cube.position.x += cube.direction;
  self.position.x += cube.direction;
}
      `
    });
  }
  if (Meteor.users.find().count() === 0) {
    console.log('creating the first user');
    Accounts.createUser({
      username: 'architect',
      email: 'architect@construct.club',
      password: 'password'
    });
  }
});


Accounts.onCreateUser(function(options, user) {
  console.log('adding new user program');
  Programs.insert({
    type: 'user',
    name: user.username,
    userId: user._id,
    position: {
      x: 0,
      y: 5,
      z: 0
    },
    man: 'Your program\'s manual!  Add help info here',
    color: Utility.randomColor(),
    contributors: [user.username],
    initialize:
    `
(self) => {
  var geometry = new THREE.CubeGeometry(10, 10, 10);
  var material = new THREE.MeshBasicMaterial({color: self.color});
  var position = self.position;
  var cube = new THREE.Mesh(geometry, material);
  cube.position.set(position.x, position.y, position.z);
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
