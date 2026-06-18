import Foundation

enum WatchDateFormatting {
    static func parse(_ string: String) -> Date? {
        let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        let isoWithFraction = ISO8601DateFormatter()
        isoWithFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = isoWithFraction.date(from: trimmed) {
            return date
        }

        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime]
        if let date = iso.date(from: trimmed) {
            return date
        }

        let dayOnly = DateFormatter()
        dayOnly.locale = Locale(identifier: "en_US_POSIX")
        dayOnly.dateFormat = "yyyy-MM-dd"
        if let date = dayOnly.date(from: trimmed) {
            return date
        }

        return nil
    }

    static func displayDateTime(_ date: Date) -> String {
        let calendar = Calendar.current

        if calendar.isDateInToday(date) {
            return String(
                format: NSLocalizedString("watch.date.today_time", comment: ""),
                formatTime(date)
            )
        }

        if calendar.isDateInYesterday(date) {
            return String(
                format: NSLocalizedString("watch.date.yesterday_time", comment: ""),
                formatTime(date)
            )
        }

        return "\(formatDayMonth(date)), \(formatTime(date))"
    }

    static func displayDueDate(_ date: Date) -> String {
        let calendar = Calendar.current

        if calendar.isDateInToday(date) {
            return NSLocalizedString("watch.date.today", comment: "")
        }

        if calendar.isDateInTomorrow(date) {
            return NSLocalizedString("watch.date.tomorrow", comment: "")
        }

        return formatDayMonth(date)
    }

    static func displayFromISO(_ string: String) -> String {
        guard let date = parse(string) else { return string }
        return displayDateTime(date)
    }

    static func displayDueFromPayload(_ string: String) -> String {
        guard let date = parse(string) else { return string }
        return displayDueDate(date)
    }

    private static func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.setLocalizedDateFormatFromTemplate("jm")
        return formatter.string(from: date)
    }

    private static func formatDayMonth(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.setLocalizedDateFormatFromTemplate("d MMM")
        return formatter.string(from: date)
    }
}
