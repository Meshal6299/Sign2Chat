import 'package:flutter/material.dart';
import 'package:camera/camera.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const Sign2ChatApp());
}

class Sign2ChatApp extends StatelessWidget {
  const Sign2ChatApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sign2Chat',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF6392F9)),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        useMaterial3: true,
      ),
      home: const Sign2ChatDashboard(),
    );
  }
}

class Sign2ChatDashboard extends StatelessWidget {
  const Sign2ChatDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        title: const Row(
          children: [
            Icon(Icons.auto_awesome, color: Color(0xFF6392F9)),
            SizedBox(width: 10),
            Text("Sign2Chat", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
          ],
        ),
        actions: [
          IconButton(onPressed: () {}, icon: const Icon(Icons.history, color: Colors.grey)),
          IconButton(onPressed: () {}, icon: const Icon(Icons.settings, color: Colors.grey)),
          const SizedBox(width: 10),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(minWidth: 1000, minHeight: 600),
          child: Row(
            children: [
              // --- LEFT SIDE: CHAT (50%) ---
              const Expanded(
                flex: 1, // 50% share
                child: ChatPanel(),
              ),

              // --- CENTER DIVIDER ---
              VerticalDivider(width: 1, thickness: 1, color: Colors.grey[200]),

              // --- RIGHT SIDE: CAMERA (50%) ---
              const Expanded(
                flex: 1, // 50% share
                child: CameraPanel(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// --- CAMERA PANEL ---
class CameraPanel extends StatefulWidget {
  const CameraPanel({super.key});

  @override
  State<CameraPanel> createState() => _CameraPanelState();
}

class _CameraPanelState extends State<CameraPanel> {
  CameraController? _controller;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    final cameras = await availableCameras();
    if (cameras.isEmpty) return;
    _controller = CameraController(cameras[0], ResolutionPreset.high);
    try {
      await _controller!.initialize();
      if (mounted) setState(() => _isInitialized = true);
    } catch (e) {
      debugPrint(e.toString());
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      child: Stack(
        children: [
          Center(
            child: _isInitialized
                ? CameraPreview(_controller!)
                : const CircularProgressIndicator(color: Colors.white),
          )
        ],
      ),
    );
  }
}

// --- CHAT PANEL ---
class ChatPanel extends StatelessWidget {
  const ChatPanel({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(30),
            children: const [
              ChatMsg(isMe: false, text: "Hello! I'm Alex. I use Sign Language to communicate."),
              ChatMsg(isMe: true, text: "Hi Alex! I'm using Bridge to translate. How are you?"),
              ChatMsg(isMe: false, text: "I am doing great. This technology is a game changer!"),
            ],
          ),
        ),
        const ChatInputArea(),
      ],
    );
  }
}

class ChatMsg extends StatelessWidget {
  final bool isMe;
  final String text;
  const ChatMsg({super.key, required this.isMe, required this.text});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        padding: const EdgeInsets.all(16),
        constraints: const BoxConstraints(maxWidth: 400),
        decoration: BoxDecoration(
          color: isMe ? const Color(0xFF6392F9) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10)],
          border: isMe ? null : Border.all(color: Colors.grey[100]!),
        ),
        child: Text(
          text,
          style: TextStyle(color: isMe ? Colors.white : Colors.black87, fontSize: 15, height: 1.4),
        ),
      ),
    );
  }
}

class ChatInputArea extends StatelessWidget {
  const ChatInputArea({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(30),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey[100]!)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              decoration: InputDecoration(
                hintText: "Type a message...",
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
              ),
            ),
          ),
          const SizedBox(width: 15),
          // Interactive Action Buttons
          _actionButton(Icons.mic, Colors.grey[200]!, Colors.black87),
          const SizedBox(width: 10),
          _actionButton(Icons.send, const Color(0xFF6392F9), Colors.white),
        ],
      ),
    );
  }

  Widget _actionButton(IconData icon, Color bg, Color fg) {
    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(15),
      child: InkWell(
        onTap: () {},
        borderRadius: BorderRadius.circular(15),
        child: Container(
          padding: const EdgeInsets.all(12),
          child: Icon(icon, color: fg, size: 22),
        ),
      ),
    );
  }
}