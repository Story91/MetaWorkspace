# 📊 Blockchain Events Guide

## 🎯 **Co to są Eventy?**

Eventy to specjalne logi które nasz MetaWorkspace kontrakt emituje przy każdej ważnej transakcji. Zapisują się na blockchainie i możemy je pobierać przez Basescan API.

---

## 🔗 **Dostępne Eventy w Kontrakcie**

### **1. 🎯 AI Access Events**
```solidity
event AIAccessGranted(address indexed user, uint256 payment, uint256 timestamp)
event AIAccessRevoked(address indexed user, address indexed revokedBy, uint256 timestamp)
event AIAccessPriceUpdated(uint256 oldPrice, uint256 newPrice, uint256 timestamp)
```

### **2. 🎨 NFT Events**
```solidity
event NFTMinted(uint256 indexed tokenId, address indexed creator, string indexed roomId, uint8 contentType, string ipfsHash)
event VoiceNFTCreated(uint256 indexed tokenId, string indexed roomId, string ipfsHash, uint256 duration)
event VideoNFTCreated(uint256 indexed tokenId, string indexed roomId, string ipfsHash, uint256 duration)
```

### **3. 🏠 Room Events**
```solidity
event RoomCreated(string indexed roomId, string name, bool isPublic, address indexed creator)
event RoomUpdated(string indexed roomId, string newName, bool isPublic, address indexed updatedBy)
event RoomActivity(string indexed roomId, string activityType, address user, uint256 timestamp)
event RoomJoined(address indexed user, string indexed roomId, uint256 fee, uint256 timestamp)
```

### **4. 💰 Financial Events**
```solidity
event WithdrawalMade(address indexed to, uint256 amount, uint256 timestamp)
event CreatorEarningsWithdrawn(address indexed creator, string indexed roomId, uint256 amount, uint256 timestamp)
event RoomJoinPriceUpdated(string indexed roomId, uint256 oldPrice, uint256 newPrice, address indexed updatedBy)
```

---

## 🛠️ **Jak Używać Events API**

### **Endpoint: `/api/blockchain/events`**

### **Parametry GET:**
- `event` - Typ eventu: `ai-access`, `nft-minted`, `room-activity`, `voice-nft`, `video-nft`, `room-created`, `all`
- `user` - Filtruj po adresie użytkownika
- `room` - Filtruj po ID pokoju
- `fromBlock` - Od którego bloku
- `limit` - Maksymalna liczba rezultatów (default: 50)

### **Przykłady:**

```javascript
// Wszystkie eventy AI access
fetch('/api/blockchain/events?event=ai-access&limit=20')

// Eventy użytkownika
fetch('/api/blockchain/events?user=0x123...&event=all')

// Aktywność w pokoju
fetch('/api/blockchain/events?room=workspace-main&event=room-activity')

// Ostatnie NFT
fetch('/api/blockchain/events?event=nft-minted&limit=10')
```

---

## 📋 **Format Odpowiedzi**

```json
{
  "events": [
    {
      "event": "AIAccessGranted",
      "transactionHash": "0x123...",
      "blockNumber": 123456,
      "timestamp": 1703123456,
      "data": {
        "user": "0x456...",
        "payment": 0.0001,
        "timestamp": 1703123456
      }
    }
  ],
  "total": 1,
  "contractAddress": "0x789...",
  "chainName": "Base Mainnet"
}
```

---

## 🎮 **Interface Użytkownika**

### **EventsMonitor Component**
- Real-time monitoring eventów
- Filtry po typie eventu
- Filtr "My Events Only"
- Linki do Basescan
- Auto-refresh

### **Funkcje:**
- ✅ **Filtrowanie** - po typie eventu i użytkowniku
- ✅ **Real-time** - odświeżanie na żądanie  
- ✅ **Przejrzyste UI** - ikony i opisy dla każdego typu
- ✅ **Linki zewnętrzne** - do Basescan dla szczegółów transakcji
- ✅ **Responsywne** - działa na mobile i desktop

---

## 🔍 **Dlaczego to Ważne?**

1. **Transparentność** - Wszystkie akcje zapisane na blockchainie
2. **Audytowalność** - Historia wszystkich działań
3. **Analytics** - Dane o aktywności użytkowników i rooms
4. **Debugging** - Łatwe śledzenie problemów z transakcjami
5. **Gamification** - Możliwość tworzenia achievement systemów

---

## ⚡ **Performance**

- **Cache w Neon DB** - Eventy nie cachujemy (zawsze świeże)
- **Rate Limiting** - Basescan API ma limity (5 req/sec)
- **Pagination** - Maksymalnie 50 eventów na request
- **Indexing** - Eventy mają indexed parameters dla szybkich queries

---

## 🚀 **Przyszłe Rozszerzenia**

- **Websocket updates** - Real-time eventy
- **Push notifications** - Powiadomienia o nowych eventach
- **Advanced filters** - Po dacie, typie transakcji, etc.
- **Data export** - CSV/JSON eksport eventów
- **Analytics dashboard** - Grafy i statystyki

