(function(){
  Snix.idOf = function(any){
    if(any == null)
      throw "illegal argument";

    return ((typeof(any) == "string" || typeof(any) == "number") ? any : Snix.unwrap(any.id)).toString();
  };

  Snix.unwrap = function(any){
    return any && any.__snix__ ? Snix.unwrap(any()) : any;
  };  
})();
