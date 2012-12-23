describe("Snix", function(){

  it("sets the Snix.__caller__ attribute and applies fun against context, and restores the previous Snix.__caller__ value", function(){
    var caller = {};

    var obj = {
      fun: function(){
        expect(Snix.__caller__).toBe(caller);
      }
    };

    spyOn(obj, "fun").andCallThrough();
    Snix.call(obj.fun, caller, obj);

    expect(obj.fun).toHaveBeenCalled();
    expect(Snix.__caller__).toBeNull();

    obj.fun.reset();

    var existingCaller = {};
    try{
      Snix.__caller__ = existingCaller;

      Snix.call(obj.fun, caller, obj);

      expect(obj.fun).toHaveBeenCalled();
      expect(Snix.__caller__).toBe(existingCaller);
    }finally{
      Snix.__caller__ = null;
    }
  });

  describe("Types", function(){
    it("converts the passed value to an integer", function(){
      var v = Snix.int(10);
      expect(v()).toBe(10);
      v(20);
      expect(v()).toBe(20);
      v(null);
      expect(v()).toBeNull();
      v("30");
      expect(v()).toBe(30);
    });

    it("converts the passed value to a float", function(){
      var v = Snix.float(10.1);
      expect(v()).toBe(10.1);
      v(20.1);
      expect(v()).toBe(20.1);
      v(null);
      expect(v()).toBeNull();
      v("30.1");
      expect(v()).toBe(30.1);
    });

    it("converts the passed value to a boolean", function(){
      var v = Snix.boolean(true);
      expect(v()).toBeTruthy();
      expect(v(false)()).toBeFalsy();
      expect(v(null)()).toBeNull();
      expect(v("true")()).toBeTruthy();
      expect(v("false")()).toBeFalsy();
      expect(v("yes")()).toBeTruthy();
      expect(v("")()).toBeFalsy();
    });

    describe("Array", function(){
      it("fails when passing a non array value", function(){
        
        expect(function(){
          Snix.array({});
        }).toThrow("not an array");

        var v = Snix.array([]);

        expect(function(){
          v({});
        }).toThrow("not an array");

        var v = Snix.array([]);
        expect(v()).toEqual([]);
      });

      it("adds an entry to the array", function(){
        var v = Snix.array([]);
        v.add(10);
        expect(v()).toEqual([10]);
      });

      it("removes an entry from the array", function(){
        var v = Snix.array([10]);
        v.remove(10);
        expect(v()).toEqual([]);
      });

      it("returns the number of entries in the array", function(){
        var v = Snix.array([]);
        expect(v.size()).toBe(0);
        v.add(10);
        expect(v.size()).toBe(1);
      });

      it("returns true if the array has no entries, false otherwise", function(){
        var v = Snix.array([]);
        expect(v.isEmpty()).toBeTruthy();
        v.add(10);
        expect(v.isEmpty()).toBeFalsy();
      });

      it("removes all entries from the array", function(){
        var v = Snix.array([1,2,3]);
        v.clear();
        expect(v()).toEqual([]);
      });
    });
  });

  it("returns the unwrapped value of a snix function", function(){
    var fun = new Snix.Value(100).fun();
    expect(Snix.unwrap(fun)).toBe(100);
    expect(Snix.unwrap(100)).toBe(100);
  });

  describe("Value", function(){

    it("can not be created without passing a valueProvider", function(){
      expect(function(){
        new Snix.Value();
      }).toThrow("missing valueProvider");

      expect(function(){
        new Snix.Value(undefined);
      }).toThrow("missing valueProvider");

      expect(typeof(new Snix.Value(10))).toBe("object");
      expect(typeof(new Snix.Value([]))).toBe("object");
      expect(typeof(new Snix.Value({}))).toBe("object");
      expect(typeof(new Snix.Value(false))).toBe("object");
      expect(typeof(new Snix.Value(true))).toBe("object");
      expect(typeof(new Snix.Value(null))).toBe("object");
    });

    it("initialized its attributes", function(){
      var v = new Snix.Value(10);
      expect(v.dependants).toEqual([]);
      expect(v.dependencies).toEqual([]);
      expect(v.isValueAssigned).toBeFalsy();
      expect(v.value).toBeNull();
      expect(v.valueProvider).toBe(10);
    });

    it("returns valueProvider as is or invokes valueProvider if it is an function and returns the result", function(){
      expect(new Snix.Value(10).provideValue()).toBe(10);
      expect(new Snix.Value(function(){
        return 100;
      }).provideValue()).toBe(100);
    });

    it("if Snix.__caller__ is set, it will be added as dependency if it is not already added and this will be added as dependency to Snix.__caller__", function(){
      var v = new Snix.Value(10);

      v.trackCaller();
      expect(v.dependants).toEqual([]);
      expect(v.dependencies).toEqual([]);

      try{
        Snix.__caller__ = {dependencies: []};
  
        v.trackCaller();
        expect(v.dependants).toEqual([Snix.__caller__]);
        expect(Snix.__caller__.dependencies).toEqual([v]);

        v.trackCaller();
        expect(v.dependants).toEqual([Snix.__caller__]); // no duplicates will be added
        expect(Snix.__caller__.dependencies).toEqual([v]);
      }finally{
        Snix.__caller__ = null;
      }
    });

    it("removes this dependencies and dependants on dispose", function(){
      var v = new Snix.Value(10);

      var x = new Snix.Value(function(){
        try{
          Snix.__caller__ = x;
          return v.get();
        }finally{
          Snix.__caller__ = null;
        }
      });
      expect(v.dependants).toEqual([]);
      x.get();

      expect(v.dependants).toEqual([x]);
      expect(x.dependencies).toEqual([v]);

      var y = new Snix.Value(function(){
        try{
          Snix.__caller__ = y;
          return v.get();
        }finally{
          Snix.__caller__ = null;
        }
      });
      expect(v.dependants).toEqual([x]);
      
      y.get();

      expect(v.dependants).toEqual([x, y]);
      expect(y.dependencies).toEqual([v]);

      y.dispose();

      expect(v.dependants).toEqual([x]);
      expect(y.dependencies).toEqual([]);

      x.dispose();

      expect(v.dependants).toEqual([]);
      expect(x.dependencies).toEqual([]);
    });

    it("releases this when passing true as argument to dispose", function(){
      var v = new Snix.Value(10);
      v.dispose(true);

      expect(v.dependants).toBeNull();
      expect(v.dependencies).toBeNull();
      expect(v.isValueAssigned).toBeNull();
      expect(v.value).toBeNull();
      expect(v.valueProvider).toBeNull();

      expect(function(){
        v.get();
      }).toThrow("disposed");

      expect(function(){
        v.set(100);
      }).toThrow("disposed");
    });

    // it("calls Snix.call passing this as caller and context", function(){
    //   var fun = function(){};
    //   spyOn(Snix, "call");

    //   var v = new Snix.Value(10);
    //   v.asCaller(fun);

    //   expect(Snix.call).toHaveBeenCalledWith(fun, v, v);      
    // });

    // it("calls Snix.call passing null as caller and this as context", function(){
    //   var fun = function(){};
    //   spyOn(Snix, "call");

    //   var v = new Snix.Value(10);
    //   v.noCaller(fun);

    //   expect(Snix.call).toHaveBeenCalledWith(fun, null, v);
    // });

    it("sets a new value", function(){
      var v = new Snix.Value(10);

      // valueProvider gets only called when using .get() method
      expect(v.value).toBeNull();

      spyOn(v, "convert").andCallThrough();
      spyOn(v, "triggerDependants");

      v.set(100);
      expect(v.value).toBe(100);
      expect(v.convert).toHaveBeenCalledWith(100);
      expect(v.triggerDependants).toHaveBeenCalled();
      v.convert.reset();
      v.triggerDependants.reset();

      v.set(200);
      expect(v.value).toBe(200);
      expect(v.convert).toHaveBeenCalledWith(200);
      expect(v.triggerDependants).toHaveBeenCalled();
      v.convert.reset();
      v.triggerDependants.reset();

      v.set(200);
      expect(v.value).toBe(200);
      // value has not been changed
      expect(v.triggerDependants).not.toHaveBeenCalled();
    });

    it("gets a value", function(){
      var v = new Snix.Value(10);

      spyOn(v, "trackCaller").andCallThrough();
      spyOn(v, "provideValue").andCallThrough();

      expect(v.get()).toBe(10);
      expect(v.isValueAssigned).toBeTruthy();
      expect(v.trackCaller).toHaveBeenCalled();
      expect(v.provideValue).toHaveBeenCalled();

      v.trackCaller.reset();
      v.provideValue.reset();

      expect(v.get()).toBe(10);
      expect(v.trackCaller).toHaveBeenCalled();
      // value already exist
      expect(v.provideValue).not.toHaveBeenCalled();
    });

    it("returns a snix function which calls get() when invokes without arguments and set() when arguments exist", function(){
      var v = new Snix.Value(10);
      var fun = v.fun();

      expect(fun.__snix__).toBeTruthy();

      expect(typeof(fun)).toBe("function");
      expect(fun()).toBe(10);

      fun(100);
      expect(fun()).toBe(100);

      var res = fun(200);
      expect(res).toBe(fun);
    });

    it("returns the passed value back as is", function(){
      var obj = {};
      expect(new Snix.Value(10).convert(obj)).toBe(obj);
    });
  });

  it("computes some nested values", function(){
    var x = Snix.val(100);

    var y = Snix.compute(function(){
      return x() * 2;
    });

    var abc = Snix.compute(function(){
      return y() + z();
    }, this, {lazy: true});

    var z = Snix.compute(function(){
      return x() * 2;
    });

    x(200);
  });

  it("array test", function(){
    var arr = Snix.array();

    var c = Snix.compute(function(){
      return _.select(arr(), function(e){ 
        return e.active() == true; 
      });
    });

    c();

    expect(arr.__value__.dependants.length).toBe(1);
    expect(_.include(arr.__value__.dependants, c.__value__)).toBeTruthy();

    expect(c.__value__.dependencies.length).toBe(1);
    expect(_.include(c.__value__.dependencies, arr.__value__)).toBeTruthy();

    expect(c()).toEqual([]);

    arr([
      {name: "e1", active: Snix.boolean(false)}
    ]);

    expect(c()).toEqual([]);

    expect(c.__value__.dependencies.length).toBe(2);
    expect(_.include(c.__value__.dependencies, arr.__value__)).toBeTruthy();
    expect(_.include(c.__value__.dependencies, arr()[0].active.__value__)).toBeTruthy();

    arr()[0].active(true);

    expect(c()).toEqual([arr()[0]]);

    expect(c.__value__.dependencies.length).toBe(2);
    expect(_.include(c.__value__.dependencies, arr.__value__)).toBeTruthy();
    expect(_.include(c.__value__.dependencies, arr()[0].active.__value__)).toBeTruthy();
  });

});