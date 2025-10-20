//Select Dom elements
const input = document.getElementById('todo-input')
const addBtn = document.getElementById('add-btn')
const list = document.getElementById('todo-list')
const clearAllBtn = document.getElementById('clear-all')
const emptyState = document.getElementById('empty-state')
const snackbar = document.getElementById('snackbar')
const snackbarText = document.getElementById('snackbar-text')
const snackbarUndo = document.getElementById('snackbar-undo')

//try to load todos from local storage
const saved = localStorage.getItem('todos');
const todos = saved ? JSON.parse(saved) : [];


function saveTodo() {
    //save current todo to local storage
    localStorage.setItem('todos', JSON.stringify(todos));
}

//create a dom node for a todo object and append it to the list
function createTodoNode(todo, index) {
    const li = document.createElement('li');

    //checkbox to toggle completion
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!todo.completed;
    checkbox.addEventListener('change', () => {
        todo.completed = checkbox.checked;

        // visual feedback: strike-through when completed
        if (todo.completed) {
            textSpan.style.textDecoration = 'line-through';
        } else {
            textSpan.style.textDecoration = 'none';
        }
        saveTodo();
    })

    //text for the todo
    const textSpan = document.createElement("span");
    textSpan.textContent = todo.text;
    textSpan.style.margin = '0 8px';

    if (todo.completed) {
        textSpan.style.textDecoration = todo.completed ? 'line-through' : "";
        saveTodo();
    }
    //double-click to edit
    textSpan.addEventListener("dblclick", () => {
        const newText = prompt("Edit todo", todo.text);
        if (newText !== null) {
            todo.text = newText.trim();
            textSpan.textContent = todo.text;
            saveTodo();
        }
    })

    //delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
        // remove item and show undo snackbar
        const removed = todos.splice(index, 1)[0];
        saveTodo();
        render();
        showSnackbar(`Deleted: ${removed.text}`, () => {
            // undo -> reinsert at the same index
            todos.splice(index, 0, removed);
            saveTodo();
            render();
        });
    })

    li.appendChild(checkbox);
    li.appendChild(textSpan);
    li.appendChild(deleteBtn);
    return li;
}




//render the whole todo list from todos array
function render() {
    list.innerHTML = '';

    //recreate each item
    todos.forEach((todo, index) => {
        const node = createTodoNode(todo, index);
        list.appendChild(node);
    });

}

function addTodo() {
    const text = input.value.trim();
    if (!text) {
        return;
    }

    //push a new todo object
    todos.push({ text: text, completed: false });
    input.value = '';
    render();
    saveTodo();

}

addBtn.addEventListener('click', addTodo);

// allow pressing Enter in the input to add the todo
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// expose a minimal test API for the harness
window.__todoTest = {
    clearAll() {
        todos.length = 0;
        saveTodo();
        render();
    },
    add(text) {
        todos.push({ text: String(text), completed: false });
        saveTodo();
        render();
    },
    count() { return todos.length; },
    firstText() { return todos[0] && todos[0].text; }
};

// wire the small test harness UI if present
document.addEventListener('DOMContentLoaded', () => {
    const runBtn = document.getElementById('run-tests');
    const result = document.getElementById('test-result');
    if (runBtn && result) {
        runBtn.addEventListener('click', () => {
            // quick synchronous smoke tests
            try {
                window.__todoTest.clearAll();
                window.__todoTest.add('smoke-1');
                window.__todoTest.add('smoke-2');
                const pass = window.__todoTest.count() === 2 && window.__todoTest.firstText() === 'smoke-1';
                result.textContent = pass ? 'All tests passed ✅' : 'Some tests failed ❌';
            } catch (err) {
                result.textContent = 'Test run error: ' + err.message;
            }
        });
    }
});

render();

// helper to show/hide empty state
function updateEmptyState() {
    if (todos.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
    }
}

updateEmptyState();

// snackbar helpers
let snackbarTimeout = null;
function showSnackbar(text, onUndo) {
    if (!snackbar) return;
    snackbarText.textContent = text;
    snackbar.classList.add('show');
    // remove previous listener
    const newUndo = () => {
        if (onUndo) onUndo();
        hideSnackbar();
    };
    // remove existing listeners by cloning
    const fresh = snackbarUndo.cloneNode(true);
    snackbarUndo.parentNode.replaceChild(fresh, snackbarUndo);
    // rebind
    fresh.addEventListener('click', newUndo);
    // auto-hide
    if (snackbarTimeout) clearTimeout(snackbarTimeout);
    snackbarTimeout = setTimeout(() => hideSnackbar(), 5000);
}

function hideSnackbar() {
    if (!snackbar) return;
    snackbar.classList.remove('show');
    if (snackbarTimeout) { clearTimeout(snackbarTimeout); snackbarTimeout = null; }
}

// autofocus input
if (input) { input.focus(); }

// Clear All handling
if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
        if (!todos.length) return;
        const previous = todos.slice();
        todos.length = 0;
        saveTodo();
        render();
        updateEmptyState();
        showSnackbar('Cleared all items', () => {
            // undo clear
            previous.forEach(t => todos.push(t));
            saveTodo();
            render();
            updateEmptyState();
        });
    });
}

// update empty state after each render call by monkey-patching render to also call updateEmptyState
const _origRender = render;
render = function () {
    _origRender();
    updateEmptyState();
};