"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ProfileSecurityTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account &amp; security</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {/* Change password */}
        <div className="flex items-center justify-between gap-4 py-4 border-b">
          <div>
            <div className="text-sm font-medium">Change password</div>
            <div className="text-sm text-muted-foreground">
              Last changed 3 months ago.
            </div>
          </div>
          <Button variant="outline" size="sm">
            Change password
          </Button>
        </div>

        {/* 2FA */}
        <div className="flex items-center justify-between gap-4 py-4 border-b">
          <div>
            <div className="text-sm font-medium flex items-center gap-2">
              Two-factor authentication
              <Badge className="bg-status-success-bg text-status-success-fg border-status-success-border">
                Enabled
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Authenticator app &middot; added 15 Jan 2025.
            </div>
          </div>
          <Button variant="outline" size="sm">
            Manage
          </Button>
        </div>

        {/* Active sessions */}
        <div className="flex items-center justify-between gap-4 py-4 border-b">
          <div>
            <div className="text-sm font-medium">Active sessions</div>
            <div className="text-sm text-muted-foreground">
              You&apos;re signed in on 2 devices.
            </div>
          </div>
          <Button variant="outline-destructive" size="sm">
            Sign out other devices
          </Button>
        </div>

        {/* Delete account */}
        <div className="flex items-center justify-between gap-4 py-4">
          <div>
            <div className="text-sm font-medium text-destructive">Delete account</div>
            <div className="text-sm text-muted-foreground">
              Permanently remove your account and all associated data.
            </div>
          </div>
          <Button variant="outline-destructive" size="sm">
            Delete account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
