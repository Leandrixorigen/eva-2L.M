/**
 * TaskFlow - INACAP
 * Gestor de Tareas con validaciones avanzadas, manipulación del DOM y sanitización
 */

document.addEventListener('DOMContentLoaded', () => {
    // === ESTADO DE LA APLICACIÓN ===
    let tasks = [];
    
    // === REFERENCIAS AL DOM ===
    const form = document.getElementById('task-form');
    const titleInput = document.getElementById('task-title');
    const prioritySelect = document.getElementById('task-priority');
    const dateInput = document.getElementById('task-date');
    const taskList = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');
    const filterStatus = document.getElementById('filter-status');
    const filterPriority = document.getElementById('filter-priority');

    // Referencias a mensajes de error
    const errorTitle = document.getElementById('error-title');
    const errorPriority = document.getElementById('error-priority');
    const errorDate = document.getElementById('error-date');

    // === INICIALIZACIÓN ===
    loadFromLocalStorage();
    renderTasks();

    // === EVENT LISTENERS ===
    form.addEventListener('submit', handleAddTask);
    filterStatus.addEventListener('change', renderTasks);
    filterPriority.addEventListener('change', renderTasks);
    
    // Validaciones en tiempo real
    titleInput.addEventListener('input', () => validateTitle(titleInput.value));
    prioritySelect.addEventListener('change', () => validatePriority(prioritySelect.value));
    dateInput.addEventListener('change', () => validateDate(dateInput.value));

    // === FUNCIONES PRINCIPALES ===

    function handleAddTask(e) {
        e.preventDefault();
        
        const title = titleInput.value;
        const priority = prioritySelect.value;
        const date = dateInput.value;

        // Validar todos los campos
        const isTitleValid = validateTitle(title);
        const isPriorityValid = validatePriority(priority);
        const isDateValid = validateDate(date);

        if (isTitleValid && isPriorityValid && isDateValid) {
            const newTask = {
                id: Date.now().toString(), // Generación de ID único simple
                title: sanitizeInput(title.trim()), // Sanitización de datos
                priority: sanitizeInput(priority),
                date: sanitizeInput(date),
                completed: false,
                createdAt: new Date().toISOString()
            };

            tasks.push(newTask);
            saveToLocalStorage();
            form.reset();
            renderTasks();
            
            // Limpiar estados de validación y enfocar el input de título
            clearValidations();
            titleInput.focus();
        }
    }

    function renderTasks() {
        taskList.innerHTML = '';
        
        // Aplicar filtros
        const statusFilterValue = filterStatus.value;
        const priorityFilterValue = filterPriority.value;

        const filteredTasks = tasks.filter(task => {
            const matchStatus = 
                statusFilterValue === 'Todas' || 
                (statusFilterValue === 'Completadas' && task.completed) ||
                (statusFilterValue === 'Pendientes' && !task.completed);
            
            const matchPriority = 
                priorityFilterValue === 'Todas' || 
                task.priority === priorityFilterValue;

            return matchStatus && matchPriority;
        });

        // Mostrar estado vacío si no hay tareas tras el filtrado
        if (filteredTasks.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            
            // Ordenar por fecha límite (más cercana primero)
            filteredTasks.sort((a, b) => new Date(a.date) - new Date(b.date));

            filteredTasks.forEach(task => {
                const li = document.createElement('li');
                li.className = `task-item ${task.completed ? 'completed' : ''}`;
                li.dataset.id = task.id;

                // Formatear fecha para visualización (dd/mm/yyyy)
                const [year, month, day] = task.date.split('-');
                const formattedDate = `${day}/${month}/${year}`;

                // Construcción segura del DOM (evitando XSS inyectado)
                li.innerHTML = `
                    <div class="task-content">
                        <span class="task-title">${task.title}</span>
                        <div class="task-meta">
                            <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
                            <span class="task-date">📅 ${formattedDate}</span>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="btn-icon btn-complete" onclick="toggleTask('${task.id}')" aria-label="Marcar como ${task.completed ? 'Pendiente' : 'Completada'}" title="Marcar como ${task.completed ? 'Pendiente' : 'Completada'}">
                            ${task.completed ? '↺' : '✓'}
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteTask('${task.id}')" aria-label="Eliminar Tarea" title="Eliminar Tarea">
                            ✕
                        </button>
                    </div>
                `;
                taskList.appendChild(li);
            });
        }
    }

    // === ACCIONES DE TAREA ===

    // Exponer al scope global para los botones onclick generados dinámicamente
    window.toggleTask = function(id) {
        tasks = tasks.map(task => {
            if (task.id === id) {
                return { ...task, completed: !task.completed };
            }
            return task;
        });
        saveToLocalStorage();
        renderTasks();
    };

    window.deleteTask = function(id) {
        if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
            // Animación de salida (opcional, aplicable agregando clase antes de eliminar)
            const item = document.querySelector(`[data-id="${id}"]`);
            if(item) {
                item.style.opacity = '0';
                item.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    tasks = tasks.filter(task => task.id !== id);
                    saveToLocalStorage();
                    renderTasks();
                }, 200);
            } else {
                tasks = tasks.filter(task => task.id !== id);
                saveToLocalStorage();
                renderTasks();
            }
        }
    };

    // === VALIDACIONES Y SEGURIDAD ===

    function validateTitle(value) {
        // Validación avanzada: Obligatorio, longitud mínima, y Regex para caracteres válidos
        // Permite letras, números, espacios y signos de puntuación comunes. Bloquea tags <>
        const regex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_.,!?()]+$/;
        
        if (!value || value.trim().length === 0) {
            showError(titleInput, errorTitle, 'El título es obligatorio.');
            return false;
        } else if (value.trim().length < 3) {
            showError(titleInput, errorTitle, 'El título debe tener al menos 3 caracteres.');
            return false;
        } else if (value.trim().length > 100) {
            showError(titleInput, errorTitle, 'El título no puede exceder 100 caracteres.');
            return false;
        } else if (/<|>|javascript:/i.test(value) || !regex.test(value)) {
            showError(titleInput, errorTitle, 'Contiene caracteres no permitidos.');
            return false;
        }
        
        clearError(titleInput, errorTitle);
        return true;
    }

    function validatePriority(value) {
        if (!value) {
            showError(prioritySelect, errorPriority, 'Seleccione una prioridad obligatoria.');
            return false;
        }
        // Validar que el valor sea uno de los esperados (evita manipulación del DOM por consola)
        const validPriorities = ['Baja', 'Media', 'Alta'];
        if (!validPriorities.includes(value)) {
            showError(prioritySelect, errorPriority, 'Prioridad inválida.');
            return false;
        }
        clearError(prioritySelect, errorPriority);
        return true;
    }

    function validateDate(value) {
        // Validar formato YYYY-MM-DD y que sea una fecha válida
        const regexDate = /^\d{4}-\d{2}-\d{2}$/;
        
        if (!value) {
            showError(dateInput, errorDate, 'La fecha límite es obligatoria.');
            return false;
        } else if (!regexDate.test(value)) {
            showError(dateInput, errorDate, 'Formato de fecha inválido.');
            return false;
        }

        const inputDate = new Date(value + 'T00:00:00'); // Evitar problemas de zona horaria local vs UTC
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (inputDate < today) {
            showError(dateInput, errorDate, 'La fecha límite no puede ser en el pasado.');
            return false;
        }

        clearError(dateInput, errorDate);
        return true;
    }

    function showError(inputEl, errorEl, message) {
        inputEl.classList.add('input-error');
        errorEl.textContent = message;
    }

    function clearError(inputEl, errorEl) {
        inputEl.classList.remove('input-error');
        errorEl.textContent = '';
    }

    function clearValidations() {
        clearError(titleInput, errorTitle);
        clearError(prioritySelect, errorPriority);
        clearError(dateInput, errorDate);
    }

    /**
     * Sanitización de entradas para prevenir ataques XSS (Cross-Site Scripting)
     * Convierte caracteres especiales en entidades HTML
     */
    function sanitizeInput(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // === ALMACENAMIENTO ===
    function saveToLocalStorage() {
        try {
            localStorage.setItem('inacap_tasks', JSON.stringify(tasks));
        } catch (e) {
            console.error('Error guardando en localStorage', e);
        }
    }

    function loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('inacap_tasks');
            if (stored) {
                tasks = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error cargando desde localStorage', e);
            tasks = [];
        }
    }
});
