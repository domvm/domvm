
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
        todos.completeAll(e.target.checked);
        vm.emit('_redraw');
    }

    function allCompleted() {
        return todos.remaining() === 0;
    }

    function filterTodos() {
        switch (currentFilter) {
            case 'active'    : return todos.findActive();
            case 'completed' : return todos.findCompleted();
            default          : return todos.all();
        }
    }

    return function() {
        var mainBody = [];

        if (todos.count()) {
            mainBody.push(
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

        return ['section.main', mainBody]
    }
}


view.Todo = function Todo(vm, data) {
    var editing = false,
        todo    = data.todo,
        todos   = data.todos;

    function toggle() {
        todos.complete(todo, !todo.completed);
        vm.emit.redraw();
    }

    function destroy() {
        todos.destroy(todo.id);
        vm.emit.redraw();
    }

    function commitEditing() {
        todo.title = vm.refs.editor.value;
        stopEditing();
        vm.redraw();
    }

    function startEditing() {
        editing = true;
        vm.redraw();
    }

    function stopEditing() {
        editing = false;
        vm.redraw();
    }

    function editorKeydown(e) {
        switch (e.keyCode) {
            case ENTER_KEY : commitEditing(); break;
            case ESC_KEY   : stopEditing();
        }
    }

    function makeCls() {
        return (todo.completed ? 'completed' : '') + (editing ? ' editing': '');
    }

    vm.hook({
        didRedraw: function() {
            vm.refs.editor.focus();
        }
    })

    return function() { return (
        ['li', {class: makeCls()},
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
        ['footer', {class: 'footer' + (todos.count() ? '' : ' hidden')},
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
