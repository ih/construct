export var MODULE = 'module';
export var USER = 'user';


export function onlyMovementAttributes(fieldNames) {
  return _.union(
    fieldNames, ['position', 'rotation', 'headRotation']).length === 3 ||
    _.isEqual(fieldNames, ['position']) || _.isEqual(fieldNames, ['rotation'])
    || _.isEqual(fieldNames, ['headRotation']) || _.isEqual(fieldNames, ['isSpeaking']);
}
