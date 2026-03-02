import { useAuth } from "@/contexts/AuthContext";
import {
    NotificationProvider,
    useNotificationBadge,
} from "@/contexts/NotificationContext";
import { DrawerToggleButton } from "@react-navigation/drawer";
import { router } from "expo-router";
import { Drawer } from "expo-router/drawer";
import {
    ArrowLeftRight,
    BarChart3,
    Bell,
    Calendar,
    ClipboardList,
    FlaskConical,
    FolderOpen,
    Home,
    Layers,
    LogOut,
    Package,
    Percent,
    Settings2,
    UserCog,
    UsersRound,
    Wallet,
} from "lucide-react-native";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const drawerStyle = {
    backgroundColor: "#ffffff",
};

function CustomDrawerContent(props: any) {
    const { logout, user } = useAuth();
    const insets = useSafeAreaInsets();
    const { unreadCount } = useNotificationBadge();

    const handleLogout = async () => {
        await logout();
        router.replace("/login");
    };

    const menuItems = [
        { name: "index", title: "Dashboard", icon: Home, section: null },
        {
            name: "patients",
            title: "Patient Management",
            icon: UsersRound,
            section: "MANAGEMENT",
        },
        {
            name: "users",
            title: "User Management",
            icon: UserCog,
            section: "MANAGEMENT",
        },
        {
            name: "services",
            title: "Lab Test Management",
            icon: FlaskConical,
            section: "MANAGEMENT",
        },
        {
            name: "appointment-calendar",
            title: "Appointment Calendar",
            icon: Calendar,
            section: "APPOINTMENTS",
        },
        {
            name: "appointments",
            title: "Appointment Management",
            icon: ClipboardList,
            section: "APPOINTMENTS",
        },
        {
            name: "inventory",
            title: "Inventory Management",
            icon: Package,
            section: "CONFIGURATION",
        },
        {
            name: "discounts-philhealth",
            title: "Discounts & PhilHealth",
            icon: Percent,
            section: "CONFIGURATION",
        },
        {
            name: "reconciliation",
            title: "Cash Reconciliation",
            icon: Wallet,
            section: "CONFIGURATION",
        },
        {
            name: "refunds",
            title: "Refund Approvals",
            icon: ArrowLeftRight,
            section: "CONFIGURATION",
        },
        {
            name: "reports",
            title: "Reports & Logs",
            icon: BarChart3,
            section: "CONFIGURATION",
        },
        {
            name: "settings",
            title: "Settings",
            icon: Settings2,
            section: "CONFIGURATION",
        },
        {
            name: "notifications",
            title: "Notifications",
            icon: Bell,
            section: "CONFIGURATION",
        },
    ];

    return (
        <View
            style={[
                styles.drawerContainer,
                { paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}
        >
            <ScrollView style={styles.drawerScroll}>
                <View style={styles.logoSection}>
                    <Image
                        source={require("@/assets/images/logo12.png")}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.menuContainer}>
                    {menuItems.map((item, index) => {
                        // Check if we should show a section header by comparing with previous item
                        const prevItem =
                            index > 0 ? menuItems[index - 1] : null;
                        const shouldShowSectionHeader =
                            item.section && item.section !== prevItem?.section;

                        const isActive =
                            props.state.routeNames[props.state.index] ===
                            item.name;
                        const IconComponent = item.icon;

                        return (
                            <View key={item.name}>
                                {shouldShowSectionHeader && (
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionHeaderText}>
                                            {item.section}
                                        </Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={[
                                        styles.menuItem,
                                        isActive && styles.menuItemActive,
                                    ]}
                                    onPress={() => {
                                        props.navigation.navigate(item.name);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <IconComponent
                                        color={isActive ? "#ffffff" : "#374151"}
                                        size={20}
                                    />
                                    <Text
                                        style={[
                                            styles.menuItemText,
                                            isActive &&
                                                styles.menuItemTextActive,
                                        ]}
                                    >
                                        {item.title}
                                    </Text>
                                    {item.name === "notifications" &&
                                        unreadCount > 0 && (
                                            <View style={styles.notifBadge}>
                                                <Text
                                                    style={
                                                        styles.notifBadgeText
                                                    }
                                                >
                                                    {unreadCount > 99
                                                        ? "99+"
                                                        : unreadCount}
                                                </Text>
                                            </View>
                                        )}
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.userSection}>
                    <View style={styles.userAvatar}>
                        <Text style={styles.avatarText}>
                            {user?.name?.charAt(0)?.toUpperCase() || "P"}
                        </Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>
                            {user?.name || "User"}
                        </Text>
                        <Text style={styles.userRole}>
                            {user?.role
                                ? user.role.charAt(0).toUpperCase() +
                                  user.role.slice(1)
                                : ""}
                        </Text>
                    </View>
                </View>
            </ScrollView>
            <View style={styles.logoutSection}>
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                    activeOpacity={0.7}
                >
                    <LogOut color="#ffffff" size={20} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function NotificationBellButton() {
    const { unreadCount } = useNotificationBadge();
    return (
        <TouchableOpacity
            onPress={() => router.push("/(drawer)/notifications")}
            style={{ marginRight: 16, position: "relative" }}
            activeOpacity={0.7}
        >
            <Bell color="#111827" size={24} />
            {unreadCount > 0 && (
                <View
                    style={{
                        position: "absolute",
                        top: -5,
                        right: -5,
                        backgroundColor: "#ac3434",
                        borderRadius: 10,
                        minWidth: 18,
                        height: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 3,
                    }}
                >
                    <Text
                        style={{
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: "700",
                        }}
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

export default function DrawerLayout() {
    return (
        <NotificationProvider>
            <Drawer
                drawerContent={(props) => <CustomDrawerContent {...props} />}
                screenOptions={{
                    drawerStyle,
                    headerLeft: () => (
                        <DrawerToggleButton tintColor="#111827" />
                    ),
                    headerRight: () => <NotificationBellButton />,
                    headerTitleAlign: "left",
                    drawerActiveTintColor: "#ffffff",
                    drawerActiveBackgroundColor: "#ac3434",
                    drawerInactiveTintColor: "#374151",
                    drawerLabelStyle: { fontSize: 15, fontWeight: "600" },
                }}
            >
                <Drawer.Screen
                    name="index"
                    options={{
                        title: "Dashboard",
                        drawerIcon: ({ color }) => (
                            <Home color={color} size={20} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="patients"
                    options={{
                        title: "Patient Management",
                        drawerIcon: ({ color }) => (
                            <UsersRound color={color} size={20} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="users"
                    options={{
                        title: "User Management",
                        drawerIcon: ({ color }) => (
                            <UserCog color={color} size={20} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="services"
                    options={{
                        title: "Lab Test Management",
                        drawerIcon: ({ color }) => (
                            <FlaskConical color={color} size={20} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="appointment-calendar"
                    options={{
                        title: "Appointment Calendar",
                        drawerIcon: ({ color }) => (
                            <Calendar color={color} size={20} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="inventory"
                    options={{
                        title: "Inventory Management",
                        drawerIcon: ({ color }) => (
                            <Package color={color} size={20} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="discounts-philhealth"
                    options={{
                        title: "Discounts & PhilHealth",
                        drawerIcon: ({ color }) => (
                            <Percent color={color} size={20} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="reconciliation"
                    options={{
                        title: "Cash Reconciliation",
                        drawerIcon: ({ color }) => (
                            <Wallet color={color} size={20} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="reports"
                    options={{
                        title: "Reports & Logs",
                        drawerIcon: ({ color }) => (
                            <BarChart3 color={color} size={20} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="lab-queue"
                    options={{
                        title: "Lab Queue",
                        drawerIcon: ({ color }) => (
                            <ClipboardList color={color} size={20} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="appointments"
                    options={{
                        title: "Appointment Management",
                        drawerIcon: ({ color }) => (
                            <ClipboardList color={color} size={20} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="refunds"
                    options={{
                        title: "Refund Approvals",
                        drawerIcon: ({ color }) => (
                            <ArrowLeftRight color={color} size={20} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="test-categories"
                    options={{
                        title: "Test Categories",
                        drawerIcon: ({ color }) => (
                            <FolderOpen color={color} size={20} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="inventory-categories"
                    options={{
                        title: "Inventory Categories",
                        drawerIcon: ({ color }) => (
                            <Layers color={color} size={20} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="notifications"
                    options={{
                        title: "Notifications",
                        drawerIcon: ({ color }) => (
                            <Bell color={color} size={20} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="settings"
                    options={{
                        title: "Settings",
                        drawerIcon: ({ color }) => (
                            <Settings2 color={color} size={20} />
                        ),
                    }}
                />
            </Drawer>
        </NotificationProvider>
    );
}

const styles = StyleSheet.create({
    drawerContainer: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    drawerScroll: {
        flex: 1,
    },
    logoSection: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 24,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        backgroundColor: "#ffffff",
    },
    logoImage: {
        width: 180,
        height: 100,
    },
    menuContainer: {
        flex: 1,
        paddingVertical: 8,
    },
    sectionHeader: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    sectionHeaderText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#9CA3AF",
        letterSpacing: 0.5,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: 8,
        marginVertical: 2,
        borderRadius: 8,
        gap: 12,
    },
    menuItemActive: {
        backgroundColor: "#ac3434",
    },
    menuItemText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#374151",
    },
    menuItemTextActive: {
        color: "#ffffff",
    },
    userSection: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        backgroundColor: "#ffffff",
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#ac3434",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        fontSize: 20,
        fontWeight: "700",
        color: "#ffffff",
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 2,
    },
    userRole: {
        fontSize: 14,
        color: "#6B7280",
    },
    logoutSection: {
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        padding: 16,
    },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: "#ac3434",
    },
    logoutText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#ffffff",
    },
    notifBadge: {
        marginLeft: "auto",
        backgroundColor: "#EF4444",
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 5,
    },
    notifBadgeText: {
        color: "#ffffff",
        fontSize: 11,
        fontWeight: "700",
    },
});
