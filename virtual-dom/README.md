### 虚拟DOM
***
运用解释器模式，用一种自定义的数据结构描述真实的DOM结构，一个真实的DOM节点会记录很多冗余信息，而自定义的数据结构只用记录一些重要的信息，消耗会小的多，可以随时根据这个数据结构还原真实的DOM，而且可以把更改的操作统一完成，只在最后去操作真实的DOM，提升性能

### 对比
真实DOM
![](https://raw.githubusercontent.com/heyach/blog/main/images/vuesourcecode/real-dom.gif)

虚拟DOM
![](https://raw.githubusercontent.com/heyach/blog/main/images/vuesourcecode/virtual-dom.jpg)

### 实现思路
1. 根据真实dom定义数据结构构建出虚拟dom，这里简单起见，只定义关键字段
```html
<div id="app">
    <ul class="ul">
        <li class="li">1</li>
        <li class="li">2</li>
        <li class="li">3</li>
        <li class="li">4</li>
    </ul>
    <button class="btn">button</button>
</div>
```
构建出的虚拟dom为
```js
var vdom = {
    tag: "div", // 标签类型
    props: {
        id: "app"
    }, // 标签的属性，attr，id，class等
    children: [
        {
            tag: "ul",
            props: {
                class: "ul"
            },
            children: [
                {
                    tag: "li",
                    props: {
                        class: "li",
                    },
                    children: ["1"]
                },
                {
                    tag: "li",
                    props: {
                        class: "li",
                    },
                    children: ["2"]
                },
                {
                    tag: "li",
                    props: {
                        class: "li",
                    },
                    children: ["3"]
                },
                {
                    tag: "li",
                    props: {
                        class: "li",
                    },
                    children: ["4"]
                }
            ]
        },
        {
            tag: "button",
            props: {
                class: "btn"
            },
            children: ["button"]
        }
    ]
}
```
2. 根据dom生成vdom
```js
function createVDom(realnode) {
    function createVNode(node) {
        // 构造一个节点
        var n = {
            tag: "",
            children: [],
            props: {
                id: "",
                class: ""
            },
            innerHTML: ""
        }
        n.tag = node.nodeName
        node.id ? (n.props.id = node.id) : null
        node.className ? (n.props.class = node.className) : null
        // 节点没有children 不用往下遍历了
        if(node.children.length > 0) {
            for(let i = 0;i < node.children.length;i++) {
                n.children.push(createVNode(node.children[i]))
            }
        } else {
            n.innerHTML = node.innerHTML
        }
        return n
    }
    return createVNode(realnode)
}
```
3. 根据vdom生成实际的dom
```js
function createElementByVDom(vnode) {
    function createDom(node) {
        var dom = document.createElement(node.tag)
        dom.id = node.props.id
        dom.className = node.props.class

        if(node.children.length > 0) {
            for(let i = 0;i < node.children.length;i++) {
                dom.appendChild(createDom(node.children[i]))
            }
        } else {
            dom.innerHTML = node.innerHTML
        }
        return dom
    }
    return createDom(vnode)
}
```
这样就可以掌握页面的结构，再辅以其他数据绑定，交互，数据更新逻辑，diff，可以最小程度的更新dom
