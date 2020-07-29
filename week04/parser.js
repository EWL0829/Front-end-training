const css = require('css');
let currentAttribute = null;
let currentToken = null;
let currentTextNode = null;
let rules = [];

let stack = [{ type: 'document', children: [] }];

function match(element, selector) {
    if (!selector || !element.attributes) {
        return false;
    }

    if (selector.charAt(0) === '#') {
        // id选择器
        let attr = element.attributes.filter(attr => attr.name === 'id')[0];
        if (attr && attr.value === selector.replace('#', '')) {
            return true;
        }
    } else if (selector.charAt(0) === '.') {
        // 类选择器
        // 其实这里可能存在多个类名的情况，可以将attr处理成数组
        let attr = element.attributes.filter(attr => attr.name === 'class')[0];
        if (attr && attr.value === selector.replace('.', '')) {
            return true;
        }

    } else {
        if (element.tagName === selector) {
            return true;
        }
    }

    return false;
}

function addCSSRules(text) {
    const ast = css.parse(text);
    rules.push(...ast.stylesheet.rules);
}


function computeCSS(element) {
    // CSS规则都是从右向左匹配的
    // 这里使用slice进行一次数组的复制，防止污染stack数组
    const elements = stack.slice().reverse();

    if(!element.computedStyle) {
        element.computedStyle = {};
    }

    for (let rule of rules) {
        // 这里rules里面的选择器格式为 .wrap .box .item
        // 这些选择器都是以空格分隔的，将其以空格分隔为数组
        // ['.wrap', '.box', '.item']
        // 然后将数组倒置，['.item', '.box', '.wrap']
        // 最终数组的第一个就是指向样式目标DOM的选择器
        let selectorParts = rule.selectors[0].split(' ').reverse();

        if (!match(element, selectorParts[0])) {
            continue;
        }

        let matched = false;
        // j表示当前选择器数组里选择器的位置，因为我们在寻找匹配该样式规则的元素
        // 本质上就是在elements数组中寻找对比当前数组头元素的父元素，
        // 而selectorParts中第一个是目标元素，第二个才是其父级甚至祖先级元素
        let j = 1;
        // 先在元素层面进行循环，之所以
        for (let i = 0; i < elements.length; i++) {
            // 每当选择器和元素匹配上一次，就将选择器数组的指针向后挪一位
            // 再去对比更高一级的祖先
            if (match(elements[i], selectorParts[j])) {
                j++;
            }
        }

        // 如果最终j自增的数值大于选择器的长度，说明选择器数组已经完整走完了一遍，且都能匹配上
        // 那么此时matched置为true
        if(j >= selectorParts.length) {
            matched = true;
        }

        if (matched) {
            console.log('element', element, 'matched rule', rule);
        }
    }
}

// 当状态机创建完所有的token之后，需要一个统一的接口将token输出
// 比如创建完标签、自封闭标签、文本标签
function emit (token) {
    let top = stack[stack.length - 1]; // 栈顶

    if (token.type === 'startTag') {
        let element = {
            type: 'element',
            children: [],
            attributes: [],
        };

        element.tagName = token.tagName;

        for (let p in token) {
            // 遍历非【类型】以及【标签名】的属性
            if (p !== 'type' && p !== 'tagName') {
                element.attributes.push({
                    name: p,
                    value: token[p],
                });
            }
        }

        computeCSS(element);

        top.children.push(element);
        element.parent = top;

        // 如果当前token不是自封闭的
        if (!token.isSelfClosing) {
            stack.push(element);
        }

        currentTextNode = null;
    } else if (token.type === 'endTag') {
        if (top.tagName !== token.tagName) {
            throw new Error('Tag start end doesn\'t match');
        } else {
            // =====遇到style标签时，执行添加CSS规则的操作=====
            if (top.tagName === 'style') {
                addCSSRules(top.children[0].content);
            }
            stack.pop();
        }
        currentTextNode = null;
    } else if (token.type === 'text') {
        if (currentTextNode === null) {
            currentTextNode = {
                type: 'text',
                content: '',
            };
            top.children.push(currentTextNode);
        }
        currentTextNode.content += token.content;
    }
}

const EOF = Symbol('EOF'); // end of line

// 把这里的data当做start即可
function data (c) {
    if (c === '<') {
        // 开始标签状态
        return tagOpen;
    } else if (c === EOF) {
        // 截止状态
        emit({
            type: 'EOF',
        });
        // 强行结束
        return;
    } else {
        // 文本标签
        emit({
            type: 'text',
            content: c,
        });
        return data;
    }
}

function tagOpen (c) {
    if (c === '/') {
        // 结束标签 </xxx>
        return endTagOpen;
    } else if (c.match(/^[a-zA-Z]$/)) {
        currentToken = {
            type: 'startTag',
            tagName: ''
        };
        // 开始标签或者自封闭标签
        // 这里需要进行一次reconsume，因为从当前字节开始的一段字符串都是需要进行tagName处理的
        // 所以下一次以及当前的字节都会被转入tagName函数中进行处理，直到进入下一个状态
        return tagName(c);
    } else {
        return;
    }
}

function endTagOpen (c) {
    if (c.match(/^[a-zA-Z]$/)) {
        currentToken = {
            type: 'endTag',
            tagName: '',
        };
        // 结束标签在遇到/之后，如果再遇到字母，则说明这是标签的名称
        // 同样的又是一段字符串，要进行reconsume，这里不做赘述
        return tagName(c);
    } else if (c === '>') {
        // 报错，这种情况下说明出现了</>这种标签
    } else if (c === EOF) {
        // 报错，只有一个<，后面就直接结束掉，说明标签没有封闭起来
    } else {

    }
}

function afterAttributeName (c) {
    if (c.match(/^[\t\f\n ]$/)) {
        return afterAttributeName;
    } else if (c === '/') {
        return selfClosingStartTag;
    } else if (c === '=') {
        return beforeAttributeValue;
    } else if (c === '>') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        // 捕捉到完整的attribute名值对
        emit(currentToken);
        return data;
    } else if (c === EOF) {

    } else {
        currentToken[currentAttribute.name] = currentAttribute.value;
        currentAttribute = {
            name: '',
            value: '',
        };
        return attributeName(c);
    }

}

function tagName(c) {
    // 四种空白符 tab符/禁止符/换行符/空格
    if (c.match(/^[\t\f\n ]$/)) {
        // 这种情况就是属于 <img alt 字符走到了img后面的这个空格这里，即将进入attribute属性名部分
        return beforeAttributeName;
    } else if (c === '/') {
        // 这种情况就是属于自封闭标签遇到了自封闭的斜杠
        return selfClosingStartTag;
    } else if (c.match(/^[a-zA-Z]$/)) {
        currentToken.tagName += c;

        return tagName;
    } else if (c === '>') {
        // 说明这是一个普通的开始标签，<div> 此时代码走到了>这里
        emit(currentToken);
        return data;
    } else {
        // 这种情况属于一直在标签名里面过滤字符，直到遇到以上这几种情况，就可以跳出到其他状态了
        return tagName;
    }
}

function beforeAttributeName (c) {
    if (c.match(/^[\t\f\n ]$/)) {
        // 这种情况属于标签名前面有多个空格，这里面的空格空行都当做一个空格处理即可
        return beforeAttributeName;
    } else if (c === '/' || c === '>' || c === EOF) {
        // 这种情况属于<img >这样结束的
        return afterAttributeName(c);
    } else if (c === '=') {
        // 报错
        console.log('current c', c);
    } else {
        currentAttribute = {
            name: '',
            value: '',
        };
        // 这里没有进入某种状态机，而是直接执行函数，说明这里是在reconsume
        // 这里如果不是attributeName(c)而是attributeName，那么在刚进入属性名第一个字母时就只会从而第二个开始进行
        // 属性名的积累
        // 详细过程分析如下：
        // 假设这里是attributeName，那么在判断完c变量都不符合上述几个if分支之后就会进入下一个attributeName
        // 函数的内容，只不过这个时候是将attributeName这个状态传递给下一个字节使用，而当前这个c变量中的字符会被跳过
        // 这里需要着重关注一下
        return attributeName(c);
    }
}

function attributeName (c) {
    if (c.match(/^[\t\f\n ]$/) || c === '/' || c === '>' || c === EOF) {
        return afterAttributeName(c);
    } else if (c === '=') {
        return beforeAttributeValue;
    } else if (c === '\u0000') {

    } else if (c === "\"" || c === "'" || c === '<') {

    } else {
        currentAttribute.name += c;
        return attributeName;
    }
}

function beforeAttributeValue (c) {
    if (c.match(/^[\t\f\n ]$/) || c === '/' || c === '>' || c === EOF) {
        return beforeAttributeValue;
    } else if (c === '\"') {
        return doubleQuotedAttributeValue;
    } else if (c === '\'') {
        return singleQuotedAttributeValue;
    } else if (c === '>') {

    } else {
        return UnquotedAttributeValue(c);
    }
}

function doubleQuotedAttributeValue (c) {
    // 找到双引号结束
    if (c === '\"') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return afterQuotedAttributeValue;
    } else if (c === '\u0000') {

    } else if (c === EOF) {

    } else {
        currentAttribute.value += c;
        return doubleQuotedAttributeValue;
    }
}

function singleQuotedAttributeValue (c) {
    // 找到单引号结束
    if (c === '\'') {
        currentToken[currentAttribute.name] = currentToken.value;
        return afterQuotedAttributeValue;
    } else if (c === '\u0000') {

    } else if (c === EOF) {

    } else {
        currentAttribute.value += c;
        return singleQuotedAttributeValue;
    }
}

function afterQuotedAttributeValue (c) {
    if (c.match(/^[\t\f\n ]$/)) {
        return beforeAttributeName;
    } else if (c === '/') {
        return selfClosingStartTag;
    } else if (c === '>') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        // 捕捉到完整的属性值
        emit(currentToken);
        return data;
    } else if (c === EOF) {

    } else {
        currentAttribute.value += c;
        return doubleQuotedAttributeValue;
    }
}

function UnquotedAttributeValue (c) {
    if (c.match(/^[\t\n\f ]$/)) {
        currentToken[currentAttribute.name] = currentToken.value;
        return beforeAttributeName;
    } else if (c === '/') {
        currentToken[currentAttribute.name] = currentToken.value;
        return selfClosingStartTag;
    } else if (c === '>') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return data;
    } else if (c === '\u0000') {

    } else if (c === '\"' || c === '\'' || c === '<' || c === '=' || c === '`') {

    } else if (c === EOF) {

    } else {
        currentAttribute.value += c;
        return UnquotedAttributeValue;
    }
}

function selfClosingStartTag (c) {
    if (c === '>') {
        currentToken.isSelfClosing = true;
        emit(currentToken);
        return data;
    } else if (c === EOF) {

    } else {

    }
}

module.exports.parseHTML = function parseHTML(html) {
    console.log('html', html);
    // html标准中把初始状态叫做data，为了和标准保持一致，这里也是选用了data来命名
    let state = data;
    for(let c of html) {
        state = state(c);
    }
    // 小技巧：
    // HTML最后是有一个文件终结的，比如其中有一些文本节点是没有所谓的结束状态
    // 我个人理解这里的意思就是像普通的标签节点是有结束标签或者自封闭斜杠的
    // 而文本节点后面没有一个明显的结束标志，所以这里选取了一个Symbol 类型的字符来强行结束
    // 为什么要选取一个Symbol类型的字符呢？
    // 原因在于这里的结束字符不能是任何一个有效字符，否则会被算进HTML正文，这里使用Symbol主要
    // 是为了利用Symbol的唯一性，将其作为状态机的最后一个字符输入代表着最终的截止
    state = state(EOF);
    console.log('stack', stack); // eslint-disable-line
};
