import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      toast.error('Erro ao fazer login', { description: error.message });
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/');
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    if (error) {
      toast.error('Erro ao criar conta', { description: error.message });
    } else {
      toast.success('Conta criada com sucesso!', { description: 'Você já pode fazer login.' });
      navigate('/');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-0">
              <span className="text-foreground font-bold text-3xl tracking-tight" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
                MF
              </span>
              <span className="text-muted-foreground mx-3 text-2xl font-light">|</span>
              <span className="text-foreground font-semibold text-base tracking-[0.18em] uppercase" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
                MACROFY
              </span>
            </div>
          </div>
          <CardTitle className="text-xl" style={{ fontFamily: 'var(--font-heading)' }}>Bem-vindo</CardTitle>
          <CardDescription>Plataforma de pesquisa macroeconômica</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="seu@email.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required disabled={isLoading} />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</>) : 'Entrar'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome</Label>
                  <Input id="signup-name" type="text" placeholder="Seu nome" value={signupName} onChange={(e) => setSignupName(e.target.value)} disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="seu@email.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input id="signup-password" type="password" placeholder="Mínimo 6 caracteres" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={6} disabled={isLoading} />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando conta...</>) : 'Criar Conta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
