# Flutter Supabase Client Integration

## Cómo integrar la función de login con Flutter

Después de que la función de login retorne la sesión exitosamente, necesitas configurar la sesión en el cliente de Supabase Flutter para que el usuario quede autenticado en la aplicación.

## Configuración del Cliente Supabase

Primero, asegúrate de tener configurado Supabase en tu proyecto Flutter:

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  );

  runApp(MyApp());
}

// Acceso global al cliente
final supabase = Supabase.instance.client;
```

## Llamada a la Función de Auth Manager

### Login
```dart
Future<void> login(String login, String password) async {
  try {
    final response = await supabase.functions.invoke(
      'auth_manager',
      body: {
        'action': 'login',
        'login': login,  // Puede ser email o logon_id
        'password': password,
      },
    );

    if (response.status == 200) {
      final data = response.data as Map<String, dynamic>;

      // Extraer la sesión de la respuesta
      final sessionData = data['session'] as Map<String, dynamic>;

      // Crear objeto Session de Supabase
      final session = Session.fromJson(sessionData);

      // Establecer la sesión en el cliente
      await supabase.auth.setSession(session.accessToken, session.refreshToken);

      print('Login exitoso: ${data['message']}');
    } else {
      final error = response.data as Map<String, dynamic>;
      throw Exception(error['error']);
    }
  } catch (error) {
    print('Error en login: $error');
    rethrow;
  }
}
```

### Crear Usuario
```dart
Future<void> createUser({
  required String email,
  required String logonId,
  required String password,
  String? name,
  String? phoneNumber,
}) async {
  try {
    final response = await supabase.functions.invoke(
      'auth_manager',
      body: {
        'action': 'create',
        'email': email,
        'logon_id': logonId,
        'password': password,
        'name': name,
        'phone_number': phoneNumber,
      },
    );

    if (response.status == 201) {
      final data = response.data as Map<String, dynamic>;
      print('Usuario creado: ${data['message']}');

      // Opcionalmente, puedes hacer login automático después de crear
      // await login(logonId, password);
    } else {
      final error = response.data as Map<String, dynamic>;
      throw Exception(error['error']);
    }
  } catch (error) {
    print('Error al crear usuario: $error');
    rethrow;
  }
}
```

## Ejemplo Completo en un Widget

```dart
class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _loginController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isLoading = false;

  Future<void> _handleLogin() async {
    if (_isLoading) return;

    setState(() => _isLoading = true);

    try {
      final login = _loginController.text.trim();
      final password = _passwordController.text.trim();

      await login(login, password);

      // Navegar a la pantalla principal después del login exitoso
      Navigator.of(context).pushReplacementNamed('/home');

    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $error')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Login')),
      body: Padding(
        padding: EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Campo de login (email o logon_id)
            TextField(
              controller: _loginController,
              decoration: InputDecoration(
                labelText: 'Email o Logon ID',
                hintText: 'Ingresa tu email o ID de usuario',
              ),
            ),

            // Campo de contraseña
            TextField(
              controller: _passwordController,
              decoration: InputDecoration(labelText: 'Contraseña'),
              obscureText: true,
            ),

            SizedBox(height: 20),

            // Botón de login
            ElevatedButton(
              onPressed: _isLoading ? null : _handleLogin,
              child: _isLoading
                  ? CircularProgressIndicator()
                  : Text('Iniciar Sesión'),
            ),
          ],
        ),
      ),
    );
  }
}
```

## Verificación de Autenticación

Después de establecer la sesión, puedes verificar que el usuario esté autenticado:

```dart
// Verificar si hay un usuario autenticado
final user = supabase.auth.currentUser;
if (user != null) {
  print('Usuario autenticado: ${user.email}');
}

// Escuchar cambios en el estado de autenticación
supabase.auth.onAuthStateChange.listen((event) {
  print('Estado de auth cambió: ${event.event}');
  if (event.session != null) {
    print('Sesión activa');
  } else {
    print('Sin sesión');
  }
});
```

## Manejo de Errores

Los posibles errores que puedes recibir incluyen:

- **400 Bad Request**: Datos de entrada inválidos
- **401 Unauthorized**: Credenciales incorrectas
- **404 Not Found**: Logon ID no encontrado
- **500 Internal Server Error**: Error del servidor

```dart
try {
  await loginWithEmail(email, password);
} on AuthException catch (e) {
  // Errores de Supabase Auth
  print('Error de autenticación: ${e.message}');
} catch (e) {
  // Otros errores (de la función)
  print('Error: $e');
}
```

## Logout

Para cerrar sesión:

```dart
Future<void> logout() async {
  await supabase.auth.signOut();
  // La sesión se limpiará automáticamente
}
```

## Consideraciones Importantes

1. **Seguridad**: Nunca almacenes contraseñas en texto plano
2. **Validación**: Valida los inputs antes de enviarlos
3. **Estados de carga**: Muestra indicadores de carga durante las operaciones
4. **Manejo de errores**: Proporciona feedback claro al usuario sobre errores
5. **Navegación**: Redirige apropiadamente después del login/logout

Esta integración permite que tu aplicación Flutter use la función de login personalizada mientras mantiene toda la funcionalidad de autenticación de Supabase.
