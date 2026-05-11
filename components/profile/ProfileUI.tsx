"use client";

import { AppShell } from "../Shell";

interface Profile {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
    updatedAt: string;
}

interface ProfileUIProps {
    profile: Profile | null;
    fallback: {
        email: string;
        name: string;
        role: string;
    };
}

export default function ProfileUI({ profile, fallback }: ProfileUIProps) {
    return (
        <AppShell>
            <div className="topbar">
                <div>
                    <div className="topbar-title">My profile</div>
                    <div className="topbar-subtitle">
                        Account, role, and workspace metadata.
                    </div>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div className="panel-title">Account details</div>
                <table className="table">
                    <tbody>
                        <tr>
                            <th>Email</th>
                            <td>{profile?.email ?? fallback.email}</td>
                        </tr>
                        <tr>
                            <th>Name</th>
                            <td>{profile?.name ?? fallback.name}</td>
                        </tr>
                        <tr>
                            <th>Role</th>
                            <td>{profile?.role ?? fallback.role}</td>
                        </tr>
                        {profile && (
                            <>
                                <tr>
                                    <th>Created at</th>
                                    <td>{new Date(profile.createdAt).toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <th>Last updated</th>
                                    <td>{new Date(profile.updatedAt).toLocaleString()}</td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </AppShell>
    );
}