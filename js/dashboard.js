let librosCache = [];
let modoEdicion = false;

function toggleLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = show ? 'block' : 'none';
}

function limpiarErrores() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => el.textContent = '');
}

function mostrarError(campo, mensaje) {
    const errorElement = document.getElementById(campo + 'Error');
    if (errorElement) {
        errorElement.textContent = mensaje;
    }
}

async function cargarLibros() {
    toggleLoading(true);
    try {
        const response = await fetch('/libros');
        const result = await response.json();

        if (result.success) {
            librosCache = result.data;
            renderLibros();
        } else {
            mostrarMensaje('Error al cargar los libros', 'danger');
        }
    } catch (error) {
        mostrarMensaje('Error de conexión al cargar los libros', 'danger');
    } finally {
        toggleLoading(false);
    }
}

function renderLibros() {
    const tbody = document.getElementById('libros-tbody');
    const noLibrosMsg = document.getElementById('noLibrosMessage');

    tbody.innerHTML = '';

    if (librosCache.length === 0) {
        noLibrosMsg.classList.remove('d-none');
        return;
    }

    noLibrosMsg.classList.add('d-none');

    librosCache.forEach(libro => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${libro.id}</td>
            <td><strong>${libro.titulo}</strong></td>
            <td>${libro.autor}</td>
            <td>${libro.editorial || '-'}</td>
            <td>${libro.anio_publicacion || '-'}</td>
            <td>${libro.isbn || '-'}</td>
            <td>${libro.precio ? parseFloat(libro.precio).toFixed(2) : '0.00'}</td>
            <td>
                <span class="badge ${libro.stock > 0 ? 'bg-success' : 'bg-warning'}">
                    ${libro.stock || 0}
                </span>
            </td>
            <td>
                <span class="badge ${libro.estado ? 'bg-success' : 'bg-danger'}">
                    ${libro.estado ? 'Disponible' : 'No disponible'}
                </span>
            </td>
            <td class="action-buttons">
                <button class="btn btn-primary btn-sm me-1" onclick="editarLibro(${libro.id})" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="confirmarEliminacion(${libro.id}, '${libro.titulo.replace(/'/g, "\\'")}')" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editarLibro(id) {
    const libro = librosCache.find(l => l.id === id);
    if (!libro) {
        mostrarMensaje('Libro no encontrado', 'danger');
        return;
    }

    modoEdicion = true;

    document.getElementById('modalTitulo').textContent = 'Editar Libro';
    document.getElementById('btnTexto').textContent = 'Actualizar Libro';

    document.getElementById('libroId').value = libro.id;
    document.getElementById('titulo').value = libro.titulo;
    document.getElementById('autor').value = libro.autor;
    document.getElementById('editorial').value = libro.editorial || '';
    document.getElementById('anio_publicacion').value = libro.anio_publicacion || '';
    document.getElementById('isbn').value = libro.isbn || '';
    document.getElementById('precio').value = libro.precio || '';
    document.getElementById('stock').value = libro.stock || 0;

    const modal = new bootstrap.Modal(document.getElementById('modalLibro'));
    modal.show();
}

// Nueva función para mostrar el modal de confirmación con SweetAlert
function confirmarEliminacion(id, titulo) {
    Swal.fire({
        title: '¿Confirmar eliminación?',
        html: `¿Estás seguro de que deseas eliminar el libro:<br><strong>"${titulo}"</strong>?<br><br><small class="text-muted">Esta acción cambiará su estado a "No disponible".</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="bi bi-trash"></i> Sí, eliminar',
        cancelButtonText: '<i class="bi bi-x-circle"></i> Cancelar',
        reverseButtons: true,
        customClass: {
            popup: 'swal-eliminar-libro',
            confirmButton: 'btn-confirmar-eliminar',
            cancelButton: 'btn-cancelar-eliminar'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            eliminarLibro(id);
        }
    });
}

async function eliminarLibro(id) {
    // Mostrar loading en el botón
    Swal.fire({
        title: 'Eliminando libro...',
        html: 'Por favor espera un momento.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        customClass: {
            popup: 'swal-loading'
        },
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const response = await fetch(`/eliminar-libro/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            // Cerrar el loading y mostrar éxito
            Swal.fire({
                title: '¡Eliminado!',
                text: 'Libro eliminado correctamente',
                icon: 'success',
                confirmButtonColor: '#198754',
                customClass: {
                    popup: 'swal-exito-eliminar'
                }
            });

            // También mostrar el mensaje en la interfaz principal
            mostrarMensaje('Libro eliminado correctamente', 'success');
            await cargarLibros();
        } else {
            Swal.fire({
                title: 'Error',
                text: result.message || 'Error al eliminar el libro',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
        }
    } catch (error) {
        Swal.fire({
            title: 'Error de conexión',
            text: 'Error de conexión al eliminar el libro',
            icon: 'error',
            confirmButtonColor: '#dc3545'
        });
    }
}

function mostrarMensaje(mensaje, tipo = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.children[1]);

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function validarFormulario() {
    limpiarErrores();
    let esValido = true;

    const titulo = document.getElementById('titulo').value.trim();
    const autor = document.getElementById('autor').value.trim();
    const anio = document.getElementById('anio_publicacion').value;
    const precio = document.getElementById('precio').value;
    const stock = document.getElementById('stock').value;

    if (!titulo) {
        mostrarError('titulo', 'El título es requerido');
        esValido = false;
    }

    if (!autor) {
        mostrarError('autor', 'El autor es requerido');
        esValido = false;
    }

    if (anio && (anio < 1000 || anio > 2025)) {
        mostrarError('anio', 'Año debe estar entre 1000 y 2025');
        esValido = false;
    }

    if (precio && precio < 0) {
        mostrarError('precio', 'El precio no puede ser negativo');
        esValido = false;
    }

    if (stock && stock < 0) {
        mostrarError('stock', 'El stock no puede ser negativo');
        esValido = false;
    }

    return esValido;
}

function resetearFormulario() {
    document.getElementById('formLibro').reset();
    document.getElementById('libroId').value = '';
    modoEdicion = false;
    document.getElementById('modalTitulo').textContent = 'Añadir Nuevo Libro';
    document.getElementById('btnTexto').textContent = 'Guardar Libro';
    limpiarErrores();
}

async function procesarFormulario(e) {
    e.preventDefault();

    if (!validarFormulario()) {
        return;
    }

    const btnGuardar = document.getElementById('btnGuardar');
    const spinner = document.getElementById('spinnerGuardar');

    btnGuardar.disabled = true;
    spinner.classList.remove('d-none');

    const formData = {
        titulo: document.getElementById('titulo').value.trim(),
        autor: document.getElementById('autor').value.trim(),
        editorial: document.getElementById('editorial').value.trim() || null,
        anio_publicacion: parseInt(document.getElementById('anio_publicacion').value) || null,
        isbn: document.getElementById('isbn').value.trim() || null,
        precio: parseFloat(document.getElementById('precio').value) || null,
        stock: parseInt(document.getElementById('stock').value) || 0
    };

    try {
        const libroId = document.getElementById('libroId').value;
        const url = modoEdicion ? `/actualizar-libro/${libroId}` : '/insertar-libro';
        const method = modoEdicion ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            const mensaje = modoEdicion ? 'Libro actualizado correctamente' : 'Libro añadido correctamente';
            mostrarMensaje(mensaje, 'success');

            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalLibro'));
            modal.hide();
            resetearFormulario();

            await cargarLibros();
        } else {
            mostrarMensaje(result.message || 'Error al procesar el libro', 'danger');
        }
    } catch (error) {
        mostrarMensaje('Error de conexión. Intenta de nuevo.', 'danger');
    } finally {
        btnGuardar.disabled = false;
        spinner.classList.add('d-none');
    }
}

function inicializar() {
    document.getElementById('formLibro').addEventListener('submit', procesarFormulario);
    document.getElementById('modalLibro').addEventListener('hidden.bs.modal', resetearFormulario);
    cargarLibros();
}

document.addEventListener('DOMContentLoaded', inicializar);