
(function(global) {

global.view = {};

var ENTER_KEY     = 13,
    ESC_KEY       = 27,
    currentFilter = 'all';


view.App = function App(vm, todos) {

    function addTodo(e) {
        if (e.keyCode === ENTER_KEY) {
            todos.add({ title: e.target.value });
            e.target.value = '';
            vm.emit('_redraw');
        }
    }

    return function() { return (
        ['span',
            ['header.header',
                ['h1', 'todos'],
                ['input.new-todo',
                    {
                        placeholder: 'What needs to be done?',
                        autofocus: true,
                        onkeydown: addTodo
                    }
                ]
            ],
            [view.Main, todos],
            [view.Footer, todos]
        ]
    )}
};

view.Main = function Main(vm, todos) {

    function toggleAll(e) {
        var ch = !!e.target.checked;
        todos.store.forEach(function(todo){
            todo.completed = ch;
        })
        todos.save();
        vm.emit('_redraw');
    }

    function allCompleted() {
        return todos.store.reduce(function(res, todo){
            return todo.completed && res;
        }, true)
    }

    function filterTodos() {
        var tds = todos.all();
        switch (currentFilter) {
            case 'active':
                return tds.filter(function(item){
                    return !item.completed;
                })
            break;
            case 'completed':
                return tds.filter(function(item){
                    return item.completed;
                })
            break;
            default:
                return tds;
        }
    }

    return function() {
        var util = [];

        if (todos.store.length) {
            util.push(
                ['input.toggle-all',
                    {
                        checked: allCompleted,
                        type: 'checkbox',
                        onclick: toggleAll
                    }
                ],
                ['ul.todo-list', filterTodos().map(function(todo) {
                    return [view.Todo, {todo: todo, todos: todos}]
                })]
            );
        }

        return ['section.main', util]
    }
}


view.Todo = function Todo(vm, data) {
    var editing = false,
        todo    = data.todo,
        todos   = data.todos;

    function toggle() {
        todo.completed = !todo.completed;
        todos.save();
        vm.redraw();
    }

    function destroy() {
        todos.destroy(todo.id);
        vm.emit('_redraw:1');
    }

    function commitEditing() {
        todo.title = vm.refs.editor.value;
        stopEditing();
        vm.redraw();
    }

    function startEditing() {
        editing = true;
        vm.node.el.classList.add('editing');
        vm.refs.editor.focus();
    }

    function stopEditing() {
        editing = false;
        vm.node.el.classList.remove('editing');
    }

    function editorKeydown(e) {
        switch (e.keyCode) {
            case ENTER_KEY : commitEditing(); break;
            case ESC_KEY   : stopEditing();
        }
    }

    return function() { return (
        ['li', {class: (todo.completed ? 'completed' : '')},
            ['div.view',
                ['input.toggle',
                    {
                        type: 'checkbox',
                        checked: todo.completed,
                        onclick: toggle,
                    }
                ],
                ['label', {ondblclick: startEditing}, todo.title],
                ['button.destroy', {onclick: destroy}]
            ],
            ['input.edit',
                {
                    _ref: 'editor',
                    type: 'text',
                    value: todo.title,
                    onblur: stopEditing,
                    onkeydown: editorKeydown
                }
            ]
        ]
    )}
}



view.Footer = function Footer(vm, todos) {
    var filters = {};

    function makeFilter(filtr) {
        if (! filters.hasOwnProperty(filtr)) {
            filters[filtr] = function() {
                currentFilter = filtr;
                vm.emit('_redraw');
                return false;
            }
        }
        return filters[filtr];
    }

    function makeCls(filtr) {
        return filtr === currentFilter ? 'selected' : '';
    }

    function destroyCompleted() {
        todos.destroyCompleted();
        vm.emit('_redraw');
    }

    return function() {
        var remaining  = todos.remaining();
        var countCompl = todos.count() - remaining;

        return (
        ['footer', {class: 'footer' + (todos.store.length ? '' : ' hidden')},
            ['span.todo-count',
                ['strong', remaining + (remaining === 1 ? ' item' : ' items') + ' left']
            ],
            ['ul.filters',
                ['li',
                    ['a', {href: '#', class: makeCls('all'), onclick: makeFilter('all')}, 'All']
                ],
                ['li',
                    ['a', {href: '#', class: makeCls('active'), onclick: makeFilter('active')}, 'Active']
                ],
                ['li',
                    ['a', {href: '#', class: makeCls('completed'), onclick: makeFilter('completed')}, 'Completed']
                ]
            ],
            ['button',
                {
                    class: 'clear-completed' + (countCompl === 0 ? ' hidden': ''),
                    onclick: destroyCompleted
                },
                'Clear completed'
            ]
        ])
    }
}

})(this);
