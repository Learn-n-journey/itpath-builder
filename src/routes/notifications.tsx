import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Heart, MessageCircle, UserCheck, UserPlus } from "lucide-react";
import { useCommunityNotifications } from "@/hooks/use-social-messaging";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/notifications")({ staticData: { sitemap: false }, component: NotificationsPage });
function timeLabel(value:string){const seconds=Math.max(1,Math.floor((Date.now()-new Date(value).getTime())/1000));if(seconds<60)return "now";if(seconds<3600)return Math.floor(seconds/60)+"m";if(seconds<86400)return Math.floor(seconds/3600)+"h";return Math.floor(seconds/86400)+"d";}
function NotificationsPage(){
 const {notifications,unreadCount,loading,markNotificationRead,markAllEventNotificationsRead}=useCommunityNotifications(100);
 const icon=(kind:string)=>kind==="post-like"?Heart:kind==="post-comment"?MessageCircle:kind==="friend-accepted"?UserCheck:kind==="friend-request"?UserPlus:MessageCircle;
 return <div className="mx-auto max-w-3xl space-y-5 pb-24">
  <header className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Community</p><h1 className="mt-1 font-display text-3xl font-bold">Notifications</h1><p className="mt-1 text-sm text-muted-foreground">Replies, reactions, connections, and messages that involve you.</p></div>{unreadCount>0?<Button variant="outline" size="sm" onClick={()=>void markAllEventNotificationsRead()}><CheckCheck className="size-4"/>Mark read</Button>:null}</header>
  <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
   {loading?<p className="p-6 text-sm text-muted-foreground">Loading notifications…</p>:notifications.length===0?<div className="p-10 text-center"><Bell className="mx-auto size-9 text-muted-foreground"/><p className="mt-3 font-semibold">You’re caught up</p><p className="mt-1 text-sm text-muted-foreground">Meaningful Community activity involving you will appear here.</p></div>:notifications.map(item=>{const Icon=icon(item.kind);const to=item.kind==="message"||item.kind==="friend-request"?"/messages":"/community";return <Link key={item.kind+"-"+item.id} to={to} {...(item.kind==="message"?{search:{user:item.userId}}:{})} onClick={()=>{if(item.readAt===null&&item.kind!=="message"&&item.kind!=="friend-request")void markNotificationRead(item.id)}} className="flex gap-3 border-b border-border/60 p-4 last:border-0 hover:bg-secondary/40"><span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Icon className="size-5"/>{item.readAt===null?<span className="absolute right-0 top-0 size-2.5 rounded-full border-2 border-card bg-primary"/>:null}</span><div className="min-w-0 flex-1"><div className="flex items-baseline gap-2"><p className="truncate text-sm font-bold">{item.displayName}</p><span className="ml-auto shrink-0 text-xs text-muted-foreground">{timeLabel(item.createdAt)}</span></div><p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{item.preview}</p></div></Link>})}
  </section>
 </div>;
}
