Programs = new Mongo.Collection('programs');
//Programs._collection._ensureIndex({name: 1}, {unique: true});

// add man property to programs
Migrations.add({
  version: 1,
  up: function() {
    Programs.find().forEach(function (program) {
      console.log('migration for adding man field to programs');
      Programs.update(program._id, {$set: {man: 'Your program\'s manual!  Add help info here'}});
    });
  }
});

// make names unique
Migrations.add({
  version: 2,
  up: function() {
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

// add import field to all programs
Migrations.add({
  version: 3,
  up: function() {
    Programs.find().forEach(function (program) {
      console.log('migration for adding import field to all programs');
      Programs.update(program._id, {$set: {imports: []}});
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
  Migrations.migrateTo('latest');
  if (Programs.find().count() === 0) {
    console.log('adding init program');
    Programs.insert({
      position: {
        x: -200,
        y: 100,
        z: -100
      },
      name: 'Sample Program',
      man: 'This is the man page.  You can put information here that tells what the program is about and how to use it.',
      contributors: ['architect'],
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

    Programs.insert({
      position: {
        x: 0,
        y: -1,
        z: 0
      },
      name: 'Floor',
      man: 'This is the floor',
      contributors: ['architect'],
      initialize:
      `
(self) => {
  var floorGeometry = new THREE.CubeGeometry(10000, 1, 1000);
  var material = Physijs.createMaterial(new THREE.MeshBasicMaterial({color: 'blue', wireframe: false}), 1, .9);
  var position = self.position;
  var floor = new Physijs.BoxMesh(floorGeometry, material, 0);
  floor.position.set(position.x, position.y, position.z);
  return {floor: floor};
}
      `,
      update:
      `
(renderedObjects, self) => {
  var floor = renderedObjects['floor'];
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
      y: 10,
      z: 0
    },
    rotation: {
      x: 0,
      y: 0,
      z: 0
    },
    man: 'Your program\'s manual!  Add help info here',
    color: Utility.randomColor(),
    contributors: [user.username],
    initialize:
    `
(self) => {
  var geometry = new THREE.CubeGeometry(10, 10, 10);
  // user mesh MUST be a physijs mesh
  var material = new Physijs.createMaterial(
    new THREE.MeshBasicMaterial({color: self.color}), 1, .9);
  var cube = new Physijs.BoxMesh(geometry, material);
  return {user: cube};
}
    `,
    update:
    `
(renderedObjects, self) => {
  // movement for users is controlled server side
  var user = renderedObjects['user'];
}
    `
  });


  return user;
});
