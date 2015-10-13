var Objects = new Mongo.Collection('objects');

Meteor.startup(function () {
  if (Objects.find().count() === 0) {
    Objects.insert({x: 0, y: 0, z: 0});
  }
});
