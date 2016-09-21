Programs = new Mongo.Collection('programs');
Programs._collection._ensureIndex({name: 1}, {unique: true});
Heartbeats = new Mongo.Collection('heartbeats');
Heartbeats._collection._ensureIndex({userId: 1}, {unique: true});

Meteor.methods({
  heartbeat: () => {
    var userId = Meteor.user()._id;
    console.log(`pulse ${userId}`);
    Programs.update({userId: userId}, {$set: {online: true}});
    Heartbeats.upsert({userId: userId}, {$set: {lastUpdated: Date.now(), userId: userId}});
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

  // set any users to offline if there is no recent heartbeat
  Meteor.setInterval(() => {
    console.log('checking for dead programs');
    Programs.find({type: 'user', online: true}).forEach((userProgram) => {
      var lastHeartbeat = Heartbeats.findOne({userId: userProgram.userId}).lastUpdated;
      if (Date.now() - lastHeartbeat > 25000) {
        console.log(`turning ${userProgram.userId} off`);
        Programs.update(userProgram._id, {$set: {online: false}});
      }
    });
  }, 25000);

  if (Programs.find().count() === 0) {
    console.log('adding init program');
    Programs.insert({
      position: [0, 100, 0],
      name: 'Sample Program',
      man: 'This is the man page.  You can put information here that tells what the program is about and how to use it.',
      contributors: ['architect'],
      initialize:
      `
(self) => {
  var geometry = new THREE.CubeGeometry(100, 100, 100);
  var material = new THREE.MeshBasicMaterial({color: '#00ff00'});
  var cube = new THREE.Mesh(geometry, material);
  cube.position.fromArray(self.position);
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
  self.position[0] += cube.direction;
}
      `
    });

    Programs.insert({
      position: [0, -1, 0],
      name: 'Floor',
      man: 'This is the floor',
      contributors: ['architect'],
      initialize:
      `
(self) => {
  var floorGeometry = new THREE.CubeGeometry(10000, 1, 1000);
  var texture = THREE.ImageUtils.loadTexture( 'checkerboard.jpg' );
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set( 10, 10 );
  var material = Physijs.createMaterial(new THREE.MeshBasicMaterial(
    {map: texture, side: THREE.DoubleSide}), 1, 0);
  var position = self.position;
  var floor = new Physijs.BoxMesh(floorGeometry, material, 0);
  floor.position.fromArray(position);
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
    position: [0, 10, 0],
    rotation: [0, 0, 0],
    man: 'Your program\'s manual!  Add help info here',
    color: Utility.randomColor(),
    contributors: [user.username],
    initialize:
    `
(self) => {
  var geometry = new THREE.CubeGeometry(10, 10, 10);
  // user mesh MUST be a physijs mesh
  var material = new Physijs.createMaterial(
    new THREE.MeshBasicMaterial({color: self.color}), .8, .2);
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
