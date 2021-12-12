// var data = {
//     info: "myname",
//     user: {
//         id: 1,
//         name: "tom"
//     }
// }

// 实现一个消息订阅器，发布订阅模式
function Dep() {
    this.subs = []
}
Dep.prototype = {
    // 添加一个订阅者
    addSub(sub) {
        this.subs.push(sub)
    },
    notify() {
        this.subs.forEach(sub => {
            // 每个订阅者都必须由update方法，不然会更新失效
            sub.update()
        })
    }
}
// 递归遍历data的每个属性，为其添加get和set
function observe(data) {
    if(!data || typeof data != "object") {
        // 空或者非对象类型，递归完毕
        return
    }
    Object.keys(data).forEach((key) => {
        // data[key]如果是对象也要递归处理
        defineReactive(data, key, data[key])
    })
}
function defineReactive(data, key, value) {
    // data会被其他地方订阅，所以需要维护订阅者的信息，每个属性的订阅者都不一样，当响应的属性变化时，通知订阅者update
    // 为每个key加一个订阅器
    // 当key值被访问的时候，就把关联的值加到订阅者里
    // var a = b + 1 访问b的时候会触发b的get，这个时候就把a加到b的订阅者里 dep.addSub(a)
    // 但是问题来了，dep是在defineReactive内部定义的，外部访问不到，而这里的dep又不知道a
    // 所以最好有一个全局变量能存放订阅者，既然每个属性都会new Dep，那不如就在Dep上加一个共享的属性target
    // 这样所有的Dep实例用于都可以访问到了，直接将Dep.target作为订阅者加到subs里，定义a的时候在恰当的时机把Dep.target设为a即可
    var dep = new Dep()
    observe(value)
    Object.defineProperty(data, key, {
        enumerable: true, // 可枚举
        configurable: false, // 不能再define了，不然被破坏逻辑
        get() {
            // 属性被访问
            console.log(`[${key}]被访问了`)
            // 别管这么多，Dep.target由观察者去维护，反正这里就直接把它加到订阅者里就完事了
            Dep.target && dep.addSub(Dep.target)
            return value 
        },
        set(newVal) {
            // 属性被设置
            if(value == newVal) {
                return
            }
            console.log(`[${key}]被设置了，新的值是${newVal}`)
            value = newVal;
            dep.notify()
        }
    })
}

// 实现一个watcher用来订阅data里的属性
// 当一个watcher被实例化的时候，说明谁是订阅者已经很清楚了，这个时候要把Dep.target设置为当前对象，完成订阅之后，清除Dep.target
// 怎么完成订阅呢？触发一个订阅属性的getter就行了，var val = data[key]
// 要实现一个update，当订阅的属性改变时，用来更新自己
// 如果是template里的观察者，还要触发compile
function Watcher(vm, exp, cb) {
    // vm是订阅的对象，exp是订阅的key
    this.vm = vm;
    this.cb = cb;
    this.exp = exp;
    // 新建实例即触发订阅
    this.value = this.get();
}
Watcher.prototype = {
    get() {
        // 把全局订阅者设置为this，然后添加到属性的订阅者里，删除
        Dep.target = this;
        var value = this.vm[this.exp]; //触发对应属性的getter，完成订阅
        return value;
    },
    update() {
        console.log("订阅的值改变了，做点什么")
        // 不是每次都要订阅，要做判断
        var value = this.get(); // 取到最新值
        var oldVal = this.value;
        if (value !== oldVal) {
            this.value = value;
            this.cb.call(this.vm, value, oldVal); // 执行Compile中绑定的回调，更新视图
        }
    }
}

// observe(data)
// var w = new Watcher(data, "info", () => {
//     console.log(1)
// })
// data.info;
// // [info]被访问了
// data.info = "new info"
// // [info]被设置了，新的值是new info
// // 订阅的值改变了，做点什么，这个时候已经完成了订阅，把w添加到data.info的订阅者里，当值改变时，已经触发了订阅者的更新
// data.user.id
// // [user]被访问了
// // [id]被访问了
// data.user.name = "new name"
// // [user]被访问了
// // [name]被设置了，新的值是new name
// console.log(JSON.stringify(data))
// // {"info":"new info","user":{"id":1,"name":"new name"}}

// 接下来就是实现template的解析，把html里的{{name}}添加到data里的订阅者里，当值改变时，完成html的更新

var updater = {
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        className = className.replace(oldValue, '').replace(/\s$/, '');

        var space = className && String(value) ? ' ' : '';

        node.className = className + space + value;
    },

    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};
var compileUtil = {
    text(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },
    html(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },
    model(node, vm, exp) {
        this.bind(node, vm, exp, 'model');
        var me = this,
            val = vm[exp];
        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }

            vm[exp] = newValue;
            val = newValue;
        });
    },
    class(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },
    bind(node, vm, exp, dir) {
        var updaterFn = updater[dir + 'Updater'];

        updaterFn && updaterFn(node, vm[exp]);

        new Watcher(vm, exp, function(value, oldValue) {
            updaterFn && updaterFn(node, value, oldValue);
        });
    },
    // 事件处理
    eventHandler(node, vm, exp, dir) {
        var eventType = dir.split(':')[1],
            fn = vm.$options.methods && vm.$options.methods[exp];

        if (eventType && fn) {
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },
}
function Compile(el, vm) {
    this.$vm = vm;
    this.$el = document.querySelector(el)
    // 通过fragment进行文档更新操作，学到了
    this.$fragment = this.node2Fragment(this.$el)
    this.init()
    this.$el.appendChild(this.$fragment)
}
Compile.prototype = {
    init() {
        this.compileElement(this.$fragment)
    },
    isElementNode(node) {
        return node.nodeType == 1;
    },
    isTextNode(node) {
        return node.nodeType == 3;
    },
    isDirective(attr) {
        return attr.indexOf('v-') == 0;
    },
    isEventDirective(dir) {
        return dir.indexOf('on') === 0;
    },
    compileText(node, exp) {
        compileUtil.text(node, this.$vm, exp);
    },
    node2Fragment(el) {
        var fragment = document.createDocumentFragment()
        var child
        while(child = el.firstChild) {
            fragment.appendChild(child)
        }
        return fragment
    },
    compileElement(el) {
        var childNodes = el.childNodes;
        [].slice.call(childNodes).forEach(node => {
            var text = node.textContent;
            var reg = /\{\{(.*)\}\}/;
            if(this.isElementNode(node)) {
                this.compile(node)
            } else if(this.isTextNode(node) && reg.test(text)) {
                this.compileText(node, RegExp.$1)
            }
            if(node.childNodes && node.childNodes.length) {
                this.compileElement(node)
            }
        })
    },
    compile(node) {
        var nodeAttrs = node.attributes;
        [].slice.call(nodeAttrs).forEach(attr => {
            var attrName = attr.name;
            if(this.isDirective(attrName)) {
                var exp = attr.value;
                var dir = attrName.substring(2);
                if(this.isEventDirective(dir)) {
                    compileUtil.eventHandler(node, this.$vm, exp, dir)
                } else {
                    compileUtil[dir] && compileUtil[dir](node, this.$vm, exp)
                }
            }
        })
    }
}

// 最后实现一个mvvm构造器完成整合
function MVVM(options) {
    this.$options = options;
    var data = this._data = this.$options.data;
    Object.keys(data).forEach(key => {
        this._proxy(key)
    })
    observe(data, this)
    // 完成dom解析，变量绑定，事件绑定，观察订阅，更新回调，节点分析...
    // 除了解析dom还要完成更新操作，所以要把vm传递进去
    this.$compile = new Compile(options.el, this)

}
MVVM.prototype = {
    _proxy(key) {
        Object.defineProperty(this, key, {
            configurable: false,
            enumerable: true,
            get() {
                return this._data[key]
            },
            set(newVal) {
                this._data[key] = newVal
            }
        })
    }
}
// nodeType
// 1	Element	代表元素	Element, Text, Comment, ProcessingInstruction, CDATASection, EntityReference
// 2	Attr	代表属性	Text, EntityReference
// 3	Text	代表元素或属性中的文本内容。	None
// 4	CDATASection	代表文档中的 CDATA 部分（不会由解析器解析的文本）。	None
// 5	EntityReference	代表实体引用。	Element, ProcessingInstruction, Comment, Text, CDATASection, EntityReference
// 6	Entity	代表实体。	Element, ProcessingInstruction, Comment, Text, CDATASection, EntityReference
// 7	ProcessingInstruction	代表处理指令。	None
// 8	Comment	代表注释。	None
// 9	Document	代表整个文档（DOM 树的根节点）。	Element, ProcessingInstruction, Comment, DocumentType
// 10	DocumentType	向为文档定义的实体提供接口	None
// 11	DocumentFragment	代表轻量级的 Document 对象，能够容纳文档的某个部分	Element, ProcessingInstruction, Comment, Text, CDATASection, EntityReference
// 12	Notation	代表 DTD 中声明的符号。	None