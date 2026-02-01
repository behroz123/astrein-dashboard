import SwiftUI
import FirebaseFirestore

// MARK: - Data Models
struct ItemInfo: Identifiable {
    let id: String
    let name: String
    let dateString: String?
    let stock: Int?
}

// MARK: - Main Dashboard View
struct DashboardView: View {
    @State private var totalItems: Int = 0
    @State private var todayOutCount: Int = 0
    @State private var todayInCount: Int = 0
    @State private var recentOutItems: [ItemInfo] = []
    @State private var outStats: [Int] = []
    @State private var isLoading: Bool = true
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [Color(.systemBackground), Color(.systemBackground).opacity(0.95)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            if isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.5)
                    Text("Daten werden geladen...")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            } else if let error = errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.orange)
                    Text("Fehler beim Laden")
                        .font(.headline)
                    Text(error)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                    
                    Button(action: loadStats) {
                        Text("Erneut versuchen")
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 10)
                            .background(Color.blue)
                            .cornerRadius(8)
                    }
                }
                .padding(20)
            } else {
                ScrollView {
                    VStack(spacing: 24) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Dashboard")
                                .font(.system(size: 32, weight: .bold))
                            Text("Übersicht der Lagerverwaltung")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 20)
                        .padding(.top, 16)

                        HStack(spacing: 12) {
                            StatCardNew(
                                title: "Gesamt",
                                value: totalItems,
                                icon: "box.2",
                                color: .blue,
                                backgroundColor: Color.blue.opacity(0.1)
                            )
                            StatCardNew(
                                title: "Ausgänge",
                                value: todayOutCount,
                                icon: "arrow.up.right",
                                color: .red,
                                backgroundColor: Color.red.opacity(0.1)
                            )
                            StatCardNew(
                                title: "Eingänge",
                                value: todayInCount,
                                icon: "arrow.down.left",
                                color: .green,
                                backgroundColor: Color.green.opacity(0.1)
                            )
                        }
                        .padding(.horizontal, 20)

                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Ausgänge")
                                        .font(.headline)
                                    Text("Letzte 7 Tage")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                                Image(systemName: "chart.bar.fill")
                                    .foregroundColor(.blue)
                                    .font(.title3)
                            }
                            
                            BarChartViewNew(data: outStats)
                                .frame(height: 140)
                        }
                        .padding(20)
                        .background(
                            RoundedRectangle(cornerRadius: 20)
                                .fill(Color(.systemBackground))
                                .shadow(color: Color.black.opacity(0.08), radius: 12, x: 0, y: 4)
                        )
                        .padding(.horizontal, 20)

                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Letzte Ausgänge")
                                        .font(.headline)
                                    Text("\(recentOutItems.count) Einträge")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                                Image(systemName: "list.bullet.rectangle.fill")
                                    .foregroundColor(.orange)
                                    .font(.title3)
                            }

                            if recentOutItems.isEmpty {
                                VStack(spacing: 12) {
                                    Image(systemName: "inbox")
                                        .font(.system(size: 40))
                                        .foregroundColor(.gray.opacity(0.5))
                                    Text("Keine Ausgänge heute")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 30)
                            } else {
                                VStack(spacing: 0) {
                                    ForEach(Array(recentOutItems.prefix(5)).enumerated(), id: \.offset) { index, item in
                                        HStack(spacing: 12) {
                                            Circle()
                                                .fill(Color.orange.opacity(0.2))
                                                .frame(width: 40, height: 40)
                                                .overlay(
                                                    Image(systemName: "arrow.up.right.circle.fill")
                                                        .foregroundColor(.orange)
                                                        .font(.system(size: 20))
                                                )

                                            VStack(alignment: .leading, spacing: 4) {
                                                Text(item.name)
                                                    .font(.subheadline.bold())
                                                    .lineLimit(1)
                                                Text(item.dateString ?? "-")
                                                    .font(.caption)
                                                    .foregroundColor(.secondary)
                                            }
                                            Spacer()
                                            Image(systemName: "chevron.right")
                                                .foregroundColor(.gray.opacity(0.5))
                                        }
                                        .padding(.vertical, 12)
                                        .padding(.horizontal, 12)

                                        if index < min(4, recentOutItems.count - 1) {
                                            Divider()
                                                .padding(.vertical, 4)
                                        }
                                    }
                                }
                            }
                        }
                        .padding(20)
                        .background(
                            RoundedRectangle(cornerRadius: 20)
                                .fill(Color(.systemBackground))
                                .shadow(color: Color.black.opacity(0.08), radius: 12, x: 0, y: 4)
                        )
                        .padding(.horizontal, 20)

                        Spacer(minLength: 30)
                    }
                    .padding(.vertical, 20)
                }
            }
        }
        .onAppear(perform: loadStats)
    }

    func loadStats() {
        isLoading = true
        errorMessage = nil
        
        let db = Firestore.firestore()
        
        // Laden: Gesamtzahl Artikel
        db.collection("items").getDocuments { [weak self] snap, error in
            if let error = error {
                self?.errorMessage = "Fehler beim Laden der Artikel: \(error.localizedDescription)"
                self?.isLoading = false
                return
            }
            self?.totalItems = snap?.documents.count ?? 0
        }
        
        // Laden: Ausgänge heute
        db.collection("logs")
            .whereField("type", isEqualTo: "out")
            .whereField("date", isGreaterThanOrEqualTo: Calendar.current.startOfDay(for: Date()))
            .getDocuments { [weak self] snap, error in
                if let error = error {
                    print("Fehler bei Ausgängen: \(error)")
                    return
                }
                self?.todayOutCount = snap?.documents.count ?? 0
                self?.recentOutItems = snap?.documents.compactMap { doc in
                    let name = doc["itemName"] as? String ?? doc["name"] as? String ?? "-"
                    let date = doc["date"] as? Timestamp
                    let dateString = date.map { dateFormatter($0.dateValue()) }
                    return ItemInfo(
                        id: doc.documentID,
                        name: name,
                        dateString: dateString,
                        stock: doc["quantity"] as? Int
                    )
                } ?? []
            }
        
        // Laden: Eingänge heute
        db.collection("logs")
            .whereField("type", isEqualTo: "in")
            .whereField("date", isGreaterThanOrEqualTo: Calendar.current.startOfDay(for: Date()))
            .getDocuments { [weak self] snap, error in
                if let error = error {
                    print("Fehler bei Eingängen: \(error)")
                    return
                }
                self?.todayInCount = snap?.documents.count ?? 0
            }
        
        // Laden: Ausgänge letzte 7 Tage
        let last7Days = (0..<7).map { daysAgo in dateString(daysAgo: daysAgo) }
        var stats: [Int] = Array(repeating: 0, count: 7)
        let group = DispatchGroup()
        
        for (i, day) in last7Days.enumerated() {
            group.enter()
            let startOfDay = Calendar.current.date(byAdding: .day, value: -daysAgo, to: Calendar.current.startOfDay(for: Date())) ?? Date()
            let endOfDay = Calendar.current.date(byAdding: .day, value: 1, to: startOfDay) ?? Date()
            
            db.collection("logs")
                .whereField("type", isEqualTo: "out")
                .whereField("date", isGreaterThanOrEqualTo: startOfDay)
                .whereField("date", isLessThan: endOfDay)
                .getDocuments { snap, _ in
                    stats[i] = snap?.documents.count ?? 0
                    group.leave()
                }
        }
        
        group.notify(queue: .main) { [weak self] in
            self?.outStats = stats.reversed()
            self?.isLoading = false
        }
    }

    func todayDateString() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    func dateString(daysAgo: Int) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let date = Calendar.current.date(byAdding: .day, value: -daysAgo, to: Date())!
        return formatter.string(from: date)
    }
    
    func dateFormatter(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - Stat Card Component
struct StatCardNew: View {
    let title: String
    let value: Int
    let icon: String
    let color: Color
    let backgroundColor: Color

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(value)")
                        .font(.title2.bold())
                        .foregroundColor(.primary)
                }
                Spacer()
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundColor(color)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(backgroundColor)
        .cornerRadius(16)
        .shadow(color: color.opacity(0.15), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Bar Chart Component
struct BarChartViewNew: View {
    let data: [Int]

    var body: some View {
        if data.isEmpty {
            HStack {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "chart.bar")
                        .font(.system(size: 30))
                        .foregroundColor(.gray.opacity(0.5))
                    Text("Keine Daten")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()
            }
            .padding(.vertical, 40)
        } else {
            let maxValue = max(data.max() ?? 1, 1)
            HStack(alignment: .bottom, spacing: 10) {
                ForEach(data.indices, id: \.self) { i in
                    VStack(spacing: 8) {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: [Color.blue, Color.blue.opacity(0.6)]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(height: CGFloat(data[i]) / CGFloat(maxValue) * 80)
                            .shadow(color: Color.blue.opacity(0.3), radius: 4, x: 0, y: 2)

                        Text(shortDayName(index: i))
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .frame(maxWidth: .infinity)
        }
    }

    func shortDayName(index: Int) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateFormat = "E"
        let daysAgo = 6 - index
        let date = Calendar.current.date(byAdding: .day, value: -daysAgo, to: Date())!
        return formatter.string(from: date)
    }
}

#Preview {
    DashboardView()
}
