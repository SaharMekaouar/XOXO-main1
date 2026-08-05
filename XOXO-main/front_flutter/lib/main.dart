import 'package:flutter/material.dart';
import 'package:front_flutter/api/api_client.dart';
import 'package:front_flutter/providers/auth_provider.dart';
import 'package:front_flutter/screens/home_screen.dart';
import 'package:front_flutter/screens/signup_screen.dart';
import 'package:front_flutter/services/auth_service.dart' show AuthService;
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (context) => AuthProvider(authService: AuthService(ApiClient(http.Client()))),
        ),
      ],
      child: MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Recapify',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        appBarTheme: const AppBarTheme(
          elevation: 0,
          backgroundColor: Colors.white,
          centerTitle: true,
        ),
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const HomeScreen(),
        //'/login': (context) => const LoginScreen(), // À créer
        '/signup': (context) => const SignupScreen(), // À créer
      },
    );
  }
}
