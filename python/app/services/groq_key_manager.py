import time
import threading
from typing import Tuple, List, Dict
from groq import Groq
from app.config import settings

class GroqKeyManager:
    """
    Singleton manager for rotating Groq API keys.
    Maintains a circular queue and tracks rate-limited (exhausted) keys
    to implement round-robin routing and cooldowns.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(GroqKeyManager, cls).__new__(cls)
                cls._instance._initialize()
            return cls._instance

    def _initialize(self):
        self.keys: List[str] = []
        self.clients: Dict[str, Groq] = {}
        self.exhausted_until: Dict[str, float] = {}
        self.current_index = 0
        
        if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
            self.keys.append(settings.GROQ_API_KEY.strip())
            
        if hasattr(settings, 'GROQ_API_KEYS') and settings.GROQ_API_KEYS:
            for k in settings.GROQ_API_KEYS.split(','):
                k = k.strip()
                if k and k not in self.keys:
                    self.keys.append(k)
                    
        if not self.keys:
            print("⚠️ No GROQ API keys found in environment.")
        else:
            print(f"✅ GroqKeyManager initialized with {len(self.keys)} keys.")

    def get_client(self) -> Tuple[Groq, str]:
        """
        Returns the next available (non-exhausted) Groq client and its key.
        Rotates through keys in a round-robin fashion.
        """
        if not self.keys:
            raise RuntimeError("No Groq API keys available.")
            
        with self._lock:
            start_index = self.current_index
            now = time.time()
            
            while True:
                key = self.keys[self.current_index]
                
                # Check if exhausted
                if key in self.exhausted_until:
                    if now > self.exhausted_until[key]:
                        # Cooldown passed
                        del self.exhausted_until[key]
                    else:
                        # Still in cooldown
                        self.current_index = (self.current_index + 1) % len(self.keys)
                        if self.current_index == start_index:
                            raise RuntimeError("All Groq API keys are currently rate-limited. Please try again later.")
                        continue
                        
                # We found a good key
                selected_key = key
                self.current_index = (self.current_index + 1) % len(self.keys)
                
                if selected_key not in self.clients:
                    self.clients[selected_key] = Groq(api_key=selected_key)
                    
                return self.clients[selected_key], selected_key

    def mark_exhausted(self, key: str, retry_after: int = 65):
        """Marks a key as rate-limited for a set number of seconds."""
        with self._lock:
            self.exhausted_until[key] = time.time() + retry_after
            masked_key = f"...{key[-4:]}" if len(key) > 4 else key
            print(f"⚠️ Groq API key ({masked_key}) rate-limited. Cooling down for {retry_after}s.")

    def add_key(self, api_key: str) -> bool:
        """Add a new key at runtime. Returns False if already exists."""
        api_key = api_key.strip()
        with self._lock:
            if api_key in self.keys:
                return False
            self.keys.append(api_key)
            masked = f"...{api_key[-4:]}" if len(api_key) > 4 else api_key
            print(f"✅ Groq API key ({masked}) added at runtime. Total: {len(self.keys)}")
            return True

    def remove_key(self, api_key: str) -> bool:
        """Remove a key at runtime. Returns False if not found."""
        api_key = api_key.strip()
        with self._lock:
            if api_key not in self.keys:
                return False
            self.keys.remove(api_key)
            self.clients.pop(api_key, None)
            self.exhausted_until.pop(api_key, None)
            if self.current_index >= len(self.keys):
                self.current_index = 0
            masked = f"...{api_key[-4:]}" if len(api_key) > 4 else api_key
            print(f"🗑️ Groq API key ({masked}) removed. Total: {len(self.keys)}")
            return True

    def get_total_keys(self) -> int:
        return len(self.keys)

    def get_active_keys(self) -> int:
        now = time.time()
        return sum(1 for k in self.keys if k not in self.exhausted_until or now > self.exhausted_until[k])

    def get_status(self) -> dict:
        """Returns a safe status dict (no raw keys exposed)."""
        now = time.time()
        return {
            "total": len(self.keys),
            "active": self.get_active_keys(),
            "rate_limited": len(self.keys) - self.get_active_keys(),
            "keys": [
                {
                    "masked_key": f"...{k[-4:]}" if len(k) > 4 else "***",
                    "active": k not in self.exhausted_until or now > self.exhausted_until[k],
                    "cooldown_remaining_s": max(0, int(self.exhausted_until[k] - now)) if k in self.exhausted_until and now < self.exhausted_until[k] else 0,
                }
                for k in self.keys
            ],
        }

groq_key_manager = GroqKeyManager()

