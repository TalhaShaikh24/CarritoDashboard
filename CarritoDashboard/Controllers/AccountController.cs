using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class AccountController : Controller
    {
        public IActionResult Login()
        {
            ViewData["Title"] = "Sign In - Carrito Dashboard";
            return View();
        }

        public IActionResult Logout()
        {
            return RedirectToAction("Login");
        }
    }
}
