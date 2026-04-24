import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Search, 
    Plus, 
    Users, 
    History, 
    CreditCard, 
    Trash2, 
    Settings, 
    LayoutDashboard,
    FileText,
    Activity,
    LogOut,
    HelpCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Commander = () => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { logout, user } = useAuth();

    // Toggle the menu when pressing CMD+K or CTRL+K
    useEffect(() => {
        const down = (e) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
            if (e.key === "Escape") {
                setOpen(false);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = (command) => {
        setOpen(false);
        command();
    };

    if (!user) return null;

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Commander Box */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-[600px] overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl"
                    >
                        <Command label="Global Command Menu" className="commander-root">
                            <div className="flex items-center border-b border-white/10 p-4">
                                <Search className="mr-3 h-5 w-5 text-white/50" />
                                <Command.Input 
                                    placeholder="Search actions or pages..." 
                                    className="w-full bg-transparent text-lg text-white outline-none placeholder:text-white/30"
                                />
                                <div className="ml-2 rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold text-white/50">
                                    ESC
                                </div>
                            </div>

                            <Command.List className="max-h-[400px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
                                <Command.Empty className="p-4 text-center text-white/40">
                                    No results found.
                                </Command.Empty>

                                <Command.Group heading="Main" className="px-2 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
                                    <Item icon={<LayoutDashboard />} onSelect={() => runCommand(() => navigate("/dashboard"))}>
                                        Dashboard
                                    </Item>
                                    <Item icon={<Users />} onSelect={() => runCommand(() => navigate("/labourers"))}>
                                        Manage Labourers
                                    </Item>
                                    <Item icon={<FileText />} onSelect={() => runCommand(() => navigate("/work-entries"))}>
                                        Work Entries
                                    </Item>
                                    <Item icon={<CreditCard />} onSelect={() => runCommand(() => navigate("/payments"))}>
                                        Payments
                                    </Item>
                                </Command.Group>

                                <Command.Separator className="h-px bg-white/5 mx-2 my-2" />

                                <Command.Group heading="Account" className="px-2 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
                                    <Item icon={<Settings />} onSelect={() => runCommand(() => navigate("/settings"))}>
                                        Settings
                                    </Item>
                                    <Item icon={<Trash2 />} onSelect={() => runCommand(() => navigate("/recycle-bin"))}>
                                        Recycle Bin
                                    </Item>
                                    <Item icon={<Activity />} onSelect={() => runCommand(() => navigate("/audit-logs"))}>
                                        Audit Logs
                                    </Item>
                                    <Item icon={<LogOut />} onSelect={() => runCommand(() => logout())} className="text-red-400">
                                        Logout
                                    </Item>
                                </Command.Group>

                                <Command.Group heading="Help" className="px-2 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
                                    <Item icon={<HelpCircle />} onSelect={() => runCommand(() => navigate("/reports"))}>
                                        View Reports
                                    </Item>
                                </Command.Group>
                            </Command.List>
                        </Command>
                        
                        <div className="flex items-center justify-between border-t border-white/10 bg-black/20 p-3 text-[10px] text-white/40">
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1">
                                    <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">Enter</kbd> to select
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">↑↓</kbd> to navigate
                                </span>
                            </div>
                            <div className="font-bold opacity-30 italic">ShramFlow Commander</div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const Item = ({ children, icon, onSelect, className }) => (
    <Command.Item
        onSelect={onSelect}
        className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-white/80 transition-all hover:bg-white/10 aria-selected:bg-white/10 aria-selected:text-white ${className}`}
    >
        <span className="h-4 w-4 text-white/50">{icon}</span>
        {children}
    </Command.Item>
);

export default Commander;
