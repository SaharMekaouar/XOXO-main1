import 'dart:convert';

import 'package:flutter/foundation.dart';
import '../services/auth_service.dart';
import '../models/user_model.dart';

class AuthProvider with ChangeNotifier {
  final AuthService authService;

AuthProvider({required this.authService});


  // auth_provider.dart
Future<bool> signup(String name, String email, String password) async {
  try {
    final response = await authService.signup(
      User(name: name, email: email, password: password),
    );
    
    if (response.statusCode == 201) {
      return true;
    } else {
      final errorData = jsonDecode(response.body);
      throw Exception(errorData['message'] ?? 'Signup failed');
    }
  } catch (e) {
    throw Exception('Signup failed: ${e.toString()}');
  }
}
}