import 'package:http/http.dart' as http;
import '../api/api_client.dart';
import '../api/endpoints.dart';
import '../models/user_model.dart';

class AuthService {
  final ApiClient apiClient;

  AuthService(this.apiClient);

  // Dans auth_service.dart
Future<http.Response> signup(User user) async {
  print('Sending signup request for: ${user.email}');
  final response = await apiClient.post(
    Endpoints.signup,
    body: user.toJson(),
  );
  print('Response status: ${response.statusCode}');
  print('Response body: ${response.body}');
  return response;
}
}