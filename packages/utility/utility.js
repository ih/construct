// Write your package code here!
Utility = {
  choose: function(array) {
    return array[Math.floor(Math.random() * array.length)];
  },
  makeTimeStamp: function () {
    return (new Date()).toISOString();
  },
  // http://www.paulirish.com/2009/random-hex-color-code-snippets/
  randomColor: function () {
    return '#' + (function co(lor){
      return (lor +=
              [0,1,2,3,4,5,6,7,8,9,'a','b','c','d','e','f'][Math.floor(Math.random()*16)])
        && (lor.length == 6) ?  lor : co(lor); })('');
  }
}
